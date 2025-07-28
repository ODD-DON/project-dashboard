-- COMPLETELY NEW INVOICE STORAGE SYSTEM
-- This replaces all previous invoice-related tables

-- Drop all old invoice tables to start fresh
DROP TABLE IF EXISTS invoice_projects CASCADE;
DROP TABLE IF EXISTS exported_invoices CASCADE;
DROP TABLE IF EXISTS invoice_numbers CASCADE;

-- 1. PENDING INVOICES TABLE
-- This stores projects that are completed and ready for invoicing
-- Data persists here until the invoice is actually exported
CREATE TABLE pending_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL UNIQUE, -- Prevents duplicate projects
    title TEXT NOT NULL,
    brand TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    priority INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Completed',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    files JSONB DEFAULT '[]'::jsonb,
    invoice_price DECIMAL(10,2) NOT NULL,
    added_to_invoice_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX (brand),
    INDEX (project_id),
    INDEX (added_to_invoice_at DESC)
);

-- 2. EXPORTED INVOICES TABLE  
-- This stores the history of all exported invoices
CREATE TABLE invoice_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT NOT NULL,
    brand TEXT NOT NULL,
    file_name TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    exported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_paid BOOLEAN DEFAULT FALSE,
    projects_data JSONB NOT NULL DEFAULT '[]'::jsonb, -- Full project data snapshot
    
    -- Indexes for performance
    INDEX (brand),
    INDEX (exported_at DESC),
    INDEX (is_paid)
);

-- 3. INVOICE COUNTERS TABLE
-- Tracks the next invoice number for each brand
CREATE TABLE invoice_counters (
    brand TEXT PRIMARY KEY,
    next_number INTEGER NOT NULL DEFAULT 1000
);

-- Insert default counters for each brand
INSERT INTO invoice_counters (brand, next_number) VALUES 
    ('Wami Live', 1000),
    ('Luck On Fourth', 2000),
    ('The Hideout', 3000);

-- Enable Row Level Security for all tables
ALTER TABLE pending_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_counters ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust based on your auth needs)
CREATE POLICY "Allow all operations on pending_invoices" ON pending_invoices
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on invoice_history" ON invoice_history
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on invoice_counters" ON invoice_counters
    FOR ALL USING (true) WITH CHECK (true);

-- 4. STORED PROCEDURE FOR ATOMIC INVOICE EXPORT
-- This ensures data consistency when exporting invoices
CREATE OR REPLACE FUNCTION export_invoice_atomic(
    p_brand TEXT,
    p_invoice_number TEXT,
    p_file_name TEXT,
    p_total_amount DECIMAL(10,2),
    p_project_ids UUID[]
) RETURNS BOOLEAN AS $$
DECLARE
    projects_snapshot JSONB;
BEGIN
    -- Get snapshot of all projects being exported
    SELECT json_agg(
        json_build_object(
            'id', project_id,
            'title', title,
            'brand', brand,
            'type', type,
            'description', description,
            'deadline', deadline,
            'priority', priority,
            'status', status,
            'created_at', created_at,
            'files', files,
            'invoicePrice', invoice_price,
            'addedToInvoiceAt', added_to_invoice_at
        )
    )
    INTO projects_snapshot
    FROM pending_invoices 
    WHERE project_id = ANY(p_project_ids) AND brand = p_brand;
    
    -- Insert into invoice history
    INSERT INTO invoice_history (
        invoice_number, 
        brand, 
        file_name, 
        total_amount, 
        is_paid, 
        projects_data
    ) VALUES (
        p_invoice_number, 
        p_brand, 
        p_file_name, 
        p_total_amount, 
        FALSE, 
        projects_snapshot
    );
    
    -- Update invoice counter
    UPDATE invoice_counters 
    SET next_number = next_number + 1 
    WHERE brand = p_brand;
    
    -- Remove exported projects from pending invoices
    DELETE FROM pending_invoices 
    WHERE project_id = ANY(p_project_ids) AND brand = p_brand;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error exporting invoice: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 5. HELPER FUNCTIONS

-- Function to add a project to pending invoices
CREATE OR REPLACE FUNCTION add_to_pending_invoice(
    p_project_id UUID,
    p_title TEXT,
    p_brand TEXT,
    p_type TEXT,
    p_description TEXT,
    p_deadline TIMESTAMP WITH TIME ZONE,
    p_priority INTEGER,
    p_created_at TIMESTAMP WITH TIME ZONE,
    p_files JSONB,
    p_invoice_price DECIMAL(10,2)
) RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO pending_invoices (
        project_id, title, brand, type, description, 
        deadline, priority, created_at, files, invoice_price
    ) VALUES (
        p_project_id, p_title, p_brand, p_type, p_description,
        p_deadline, p_priority, p_created_at, p_files, p_invoice_price
    )
    ON CONFLICT (project_id) 
    DO UPDATE SET
        title = EXCLUDED.title,
        brand = EXCLUDED.brand,
        type = EXCLUDED.type,
        description = EXCLUDED.description,
        deadline = EXCLUDED.deadline,
        priority = EXCLUDED.priority,
        created_at = EXCLUDED.created_at,
        files = EXCLUDED.files,
        invoice_price = EXCLUDED.invoice_price,
        added_to_invoice_at = NOW();
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error adding to pending invoice: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to toggle payment status
CREATE OR REPLACE FUNCTION toggle_invoice_payment(
    p_invoice_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE invoice_history 
    SET is_paid = NOT is_paid 
    WHERE id = p_invoice_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error toggling payment status: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

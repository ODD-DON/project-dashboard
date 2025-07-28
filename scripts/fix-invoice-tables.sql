-- Fix invoice tables with proper constraints and data integrity

-- First, let's ensure the invoice_projects table has the right structure
DROP TABLE IF EXISTS invoice_projects CASCADE;

CREATE TABLE invoice_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL,
    title TEXT NOT NULL,
    brand TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    priority INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    files JSONB DEFAULT '[]'::jsonb,
    invoice_price DECIMAL(10,2) NOT NULL,
    added_to_invoice_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add unique constraint to prevent duplicate projects
    CONSTRAINT unique_project_in_invoice UNIQUE (project_id)
);

-- Create indexes for better performance
CREATE INDEX idx_invoice_projects_brand ON invoice_projects(brand);
CREATE INDEX idx_invoice_projects_project_id ON invoice_projects(project_id);
CREATE INDEX idx_invoice_projects_added_at ON invoice_projects(added_to_invoice_at DESC);

-- Ensure exported_invoices table exists with proper structure
CREATE TABLE IF NOT EXISTS exported_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT NOT NULL,
    brand TEXT NOT NULL,
    file_name TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    exported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_paid BOOLEAN DEFAULT FALSE,
    projects JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Create indexes for exported_invoices
CREATE INDEX IF NOT EXISTS idx_exported_invoices_brand ON exported_invoices(brand);
CREATE INDEX IF NOT EXISTS idx_exported_invoices_exported_at ON exported_invoices(exported_at DESC);

-- Ensure invoice_numbers table exists
CREATE TABLE IF NOT EXISTS invoice_numbers (
    brand TEXT PRIMARY KEY,
    next_number INTEGER NOT NULL DEFAULT 1000
);

-- Insert or update default invoice numbers
INSERT INTO invoice_numbers (brand, next_number) VALUES 
    ('Wami Live', 1000),
    ('Luck On Fourth', 2000),
    ('The Hideout', 3000)
ON CONFLICT (brand) DO UPDATE SET
    next_number = GREATEST(invoice_numbers.next_number, EXCLUDED.next_number);

-- Enable Row Level Security
ALTER TABLE invoice_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE exported_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_numbers ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust based on your auth needs)
DROP POLICY IF EXISTS "Allow all operations on invoice_projects" ON invoice_projects;
CREATE POLICY "Allow all operations on invoice_projects" ON invoice_projects
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on exported_invoices" ON exported_invoices;
CREATE POLICY "Allow all operations on exported_invoices" ON exported_invoices
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on invoice_numbers" ON invoice_numbers;
CREATE POLICY "Allow all operations on invoice_numbers" ON invoice_numbers
    FOR ALL USING (true) WITH CHECK (true);

-- Create a stored procedure for atomic invoice processing (optional but recommended)
CREATE OR REPLACE FUNCTION process_invoice_export(
    p_brand TEXT,
    p_invoice_number TEXT,
    p_file_name TEXT,
    p_total_amount DECIMAL(10,2),
    p_projects JSONB,
    p_project_ids UUID[]
) RETURNS BOOLEAN AS $$
BEGIN
    -- Insert exported invoice
    INSERT INTO exported_invoices (
        invoice_number, brand, file_name, total_amount, is_paid, projects
    ) VALUES (
        p_invoice_number, p_brand, p_file_name, p_total_amount, FALSE, p_projects
    );
    
    -- Update invoice number
    UPDATE invoice_numbers 
    SET next_number = next_number + 1 
    WHERE brand = p_brand;
    
    -- Clear invoice projects
    DELETE FROM invoice_projects 
    WHERE project_id = ANY(p_project_ids);
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error processing invoice export: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

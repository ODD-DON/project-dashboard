-- Create invoice_projects table to store completed projects ready for invoicing
CREATE TABLE IF NOT EXISTS invoice_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL UNIQUE, -- This ensures no duplicate projects
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
    added_to_invoice_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create exported_invoices table to store invoice history
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

-- Create invoice_numbers table to track next invoice number per brand
CREATE TABLE IF NOT EXISTS invoice_numbers (
    brand TEXT PRIMARY KEY,
    next_number INTEGER NOT NULL DEFAULT 1000
);

-- Insert default invoice numbers for each brand
INSERT INTO invoice_numbers (brand, next_number) VALUES 
    ('Wami Live', 1000),
    ('Luck On Fourth', 2000),
    ('The Hideout', 3000)
ON CONFLICT (brand) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoice_projects_brand ON invoice_projects(brand);
CREATE INDEX IF NOT EXISTS idx_invoice_projects_project_id ON invoice_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_invoice_projects_added_at ON invoice_projects(added_to_invoice_at);
CREATE INDEX IF NOT EXISTS idx_exported_invoices_brand ON exported_invoices(brand);
CREATE INDEX IF NOT EXISTS idx_exported_invoices_exported_at ON exported_invoices(exported_at);

-- Enable Row Level Security
ALTER TABLE invoice_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE exported_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_numbers ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations
CREATE POLICY "Allow all operations on invoice_projects" ON invoice_projects
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on exported_invoices" ON exported_invoices
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on invoice_numbers" ON invoice_numbers
    FOR ALL USING (true) WITH CHECK (true);

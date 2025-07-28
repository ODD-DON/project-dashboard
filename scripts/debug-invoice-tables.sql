-- Debug script to check invoice table structure and data

-- Check if tables exist and their structure
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name IN ('invoice_projects', 'exported_invoices', 'invoice_numbers')
ORDER BY table_name, ordinal_position;

-- Check data in invoice_projects table
SELECT 'invoice_projects' as table_name, count(*) as row_count FROM invoice_projects
UNION ALL
SELECT 'exported_invoices' as table_name, count(*) as row_count FROM exported_invoices
UNION ALL
SELECT 'invoice_numbers' as table_name, count(*) as row_count FROM invoice_numbers;

-- Show sample data from each table
SELECT 'invoice_projects sample:' as info;
SELECT * FROM invoice_projects LIMIT 5;

SELECT 'exported_invoices sample:' as info;
SELECT * FROM exported_invoices LIMIT 5;

SELECT 'invoice_numbers sample:' as info;
SELECT * FROM invoice_numbers;

-- Check for any data type issues
SELECT project_id, brand, invoice_price, added_to_invoice_at 
FROM invoice_projects 
WHERE invoice_price IS NULL OR added_to_invoice_at IS NULL;

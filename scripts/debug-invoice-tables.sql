-- Debug script to check invoice tables and data
SELECT 'invoice_projects table' as table_name;
SELECT 
    brand,
    COUNT(*) as project_count,
    SUM(invoice_price) as total_amount
FROM invoice_projects 
GROUP BY brand
ORDER BY brand;

SELECT 'exported_invoices table' as table_name;
SELECT 
    brand,
    COUNT(*) as invoice_count,
    SUM(total_amount) as total_exported
FROM exported_invoices 
GROUP BY brand
ORDER BY brand;

SELECT 'invoice_numbers table' as table_name;
SELECT * FROM invoice_numbers ORDER BY brand;

-- Show recent invoice projects
SELECT 'Recent invoice projects' as info;
SELECT 
    project_id,
    title,
    brand,
    invoice_price,
    added_to_invoice_at
FROM invoice_projects 
ORDER BY added_to_invoice_at DESC 
LIMIT 10;

-- Show recent exported invoices
SELECT 'Recent exported invoices' as info;
SELECT 
    invoice_number,
    brand,
    file_name,
    total_amount,
    is_paid,
    exported_at
FROM exported_invoices 
ORDER BY exported_at DESC 
LIMIT 10;

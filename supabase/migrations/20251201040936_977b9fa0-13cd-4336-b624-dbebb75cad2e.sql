-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true);

-- Create storage policy for viewing company logos (public)
CREATE POLICY "Anyone can view company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Create storage policy for uploading company logos (admins only)
CREATE POLICY "Admins can upload company logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create storage policy for updating company logos (admins only)
CREATE POLICY "Admins can update company logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create storage policy for deleting company logos (admins only)
CREATE POLICY "Admins can delete company logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-logos' AND
  has_role(auth.uid(), 'admin'::app_role)
);
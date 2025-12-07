-- Add DELETE policy for invoices (admin only or creator)
CREATE POLICY "Authenticated users can delete invoices"
ON public.invoices
FOR DELETE
USING (true);

-- Add DELETE policy for dyeing_bills
CREATE POLICY "Authenticated users can delete dyeing bills"
ON public.dyeing_bills
FOR DELETE
USING (true);
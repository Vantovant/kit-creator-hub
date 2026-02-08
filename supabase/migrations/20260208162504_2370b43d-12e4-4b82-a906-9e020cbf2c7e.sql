CREATE POLICY "Admins can update prospect_tags" 
ON public.prospect_tags 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));
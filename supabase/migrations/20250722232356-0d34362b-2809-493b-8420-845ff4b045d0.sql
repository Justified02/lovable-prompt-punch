-- Create lead_history table
CREATE TABLE public.lead_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  email TEXT NOT NULL,
  linkedin TEXT,
  snippet TEXT,
  generated_email TEXT,
  email_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  image TEXT,
  company_domain TEXT
);

-- Enable Row Level Security
ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;

-- Create policies for lead_history
CREATE POLICY "Users can view their own lead history" 
ON public.lead_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lead history" 
ON public.lead_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lead history" 
ON public.lead_history 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lead history" 
ON public.lead_history 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lead_history_updated_at
    BEFORE UPDATE ON public.lead_history
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_lead_history_user_id ON public.lead_history(user_id);
CREATE INDEX idx_lead_history_created_at ON public.lead_history(created_at DESC);
CREATE INDEX idx_lead_history_email_sent ON public.lead_history(email_sent);
CREATE INDEX idx_lead_history_generated_email ON public.lead_history(generated_email) WHERE generated_email IS NOT NULL;
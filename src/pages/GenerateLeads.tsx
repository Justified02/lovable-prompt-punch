import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, Loader2, Search, Target } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useToast } from '@/hooks/use-toast';

export default function GenerateLeads() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    companySize: '',
    industry: '',
    location: '',
    jobTitles: '',
    keywords: '',
    leadCount: '10'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.industry || !formData.jobTitles) {
      toast({
        title: "Missing Information",
        description: "Please fill in at least the industry and job titles fields.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const response = await fetch('https://divverse-community.app.n8n.cloud/webhook-test/lead-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          user_id: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate leads');
      }

      const result = await response.json();
      
      toast({
        title: "Leads generated successfully!",
        description: `Found ${result.leads_count || 'some'} potential leads. Check your history to view them.`,
      });

      // Reset form
      setFormData({
        companySize: '',
        industry: '',
        location: '',
        jobTitles: '',
        keywords: '',
        leadCount: '10'
      });

    } catch (error: any) {
      console.error('Error generating leads:', error);
      toast({
        title: "Error generating leads",
        description: error.message || "Failed to generate leads. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
            <Zap className="w-8 h-8" />
            <span>Generate Leads</span>
          </h1>
          <p className="text-muted-foreground">
            Use AI to find your ideal prospects and generate personalized outreach emails
          </p>
        </div>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>Lead Generation Parameters</span>
            </CardTitle>
            <CardDescription>
              Define your ideal prospect criteria to get the most relevant leads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry *</Label>
                  <Input
                    id="industry"
                    placeholder="e.g., Technology, Healthcare, Finance"
                    value={formData.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size</Label>
                  <Select value={formData.companySize} onValueChange={(value) => handleInputChange('companySize', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="startup">Startup (1-10 employees)</SelectItem>
                      <SelectItem value="small">Small (11-50 employees)</SelectItem>
                      <SelectItem value="medium">Medium (51-200 employees)</SelectItem>
                      <SelectItem value="large">Large (201-1000 employees)</SelectItem>
                      <SelectItem value="enterprise">Enterprise (1000+ employees)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g., United States, San Francisco, Remote"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leadCount">Number of Leads</Label>
                  <Select value={formData.leadCount} onValueChange={(value) => handleInputChange('leadCount', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 leads</SelectItem>
                      <SelectItem value="10">10 leads</SelectItem>
                      <SelectItem value="25">25 leads</SelectItem>
                      <SelectItem value="50">50 leads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitles">Job Titles *</Label>
                <Input
                  id="jobTitles"
                  placeholder="e.g., CEO, CTO, Marketing Director, Sales Manager"
                  value={formData.jobTitles}
                  onChange={(e) => handleInputChange('jobTitles', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords (Optional)</Label>
                <Textarea
                  id="keywords"
                  placeholder="Additional keywords or requirements for your ideal prospects..."
                  value={formData.keywords}
                  onChange={(e) => handleInputChange('keywords', e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button type="submit" disabled={isGenerating} className="min-w-[150px]">
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Generate Leads
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>How it works</CardTitle>
            <CardDescription>
              Our AI-powered lead generation process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
                  <span className="text-primary-foreground font-bold">1</span>
                </div>
                <h3 className="font-semibold">Define Criteria</h3>
                <p className="text-sm text-muted-foreground">
                  Specify your ideal prospect's industry, role, and company size
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
                  <span className="text-primary-foreground font-bold">2</span>
                </div>
                <h3 className="font-semibold">AI Search</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI searches through millions of profiles to find matches
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
                  <span className="text-primary-foreground font-bold">3</span>
                </div>
                <h3 className="font-semibold">Generate Emails</h3>
                <p className="text-sm text-muted-foreground">
                  Create personalized outreach emails for each lead
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
import React, { useState, useCallback, useRef } from "react";
import { useAnalyzeReport, useGetAiProviders, useHealthCheck } from "@workspace/api-client-react";
import { UploadCloud, FileText, CheckCircle, AlertCircle, Activity, HeartPulse, Stethoscope, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sortField, setSortField] = useState<string>("standardizedName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: healthStatus } = useHealthCheck();
  const { data: aiProviders } = useGetAiProviders();
  const analyzeMutation = useAnalyzeReport();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        handleUpload(droppedFile);
      }
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        handleUpload(selectedFile);
      }
    }
  }, []);

  const handleUpload = (uploadFile: File) => {
    const formData = new FormData();
    formData.append("file", uploadFile);
    
    // As per rules, generated mutations expect { data: BodyType }
    // AnalyzeReportBody expects { file: Blob } but we must match the custom generated hook signature
    analyzeMutation.mutate({ data: { file: uploadFile } } as any);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const currentProvider = aiProviders?.providers.find(p => p.id === aiProviders.currentProvider);
  const result = analyzeMutation.data;

  const sortedBiomarkers = React.useMemo(() => {
    if (!result?.biomarkers) return [];
    
    return [...result.biomarkers].sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [result?.biomarkers, sortField, sortOrder]);

  const getStatusBadge = (classification: string) => {
    switch(classification) {
      case 'optimal':
        return <Badge className="bg-optimal hover:bg-optimal/90 text-optimal-foreground border-transparent">Optimal</Badge>;
      case 'normal':
        return <Badge className="bg-normal hover:bg-normal/90 text-normal-foreground border-transparent">Normal</Badge>;
      case 'out_of_range':
        return <Badge className="bg-out-of-range hover:bg-out-of-range/90 text-out-of-range-foreground border-transparent">Out of Range</Badge>;
      default:
        return <Badge variant="outline">{classification}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b border-border py-4 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-primary">
            <Activity className="h-6 w-6" />
            <h1 className="text-xl font-bold tracking-tight">Lab Report Analyzer</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {healthStatus?.status === "ok" ? (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-optimal"></div>
                System Online
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-muted"></div>
                Checking Status...
              </span>
            )}
            
            {currentProvider && (
              <span className="flex items-center gap-1.5 bg-secondary px-2.5 py-1 rounded-full text-secondary-foreground border border-border">
                <Stethoscope className="h-3.5 w-3.5" />
                {currentProvider.name}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 mt-8 space-y-8">
        
        {/* Upload Section */}
        {!result && !analyzeMutation.isPending && (
          <div className="max-w-2xl mx-auto mt-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-serif text-card-foreground mb-3">Clinical Biomarker Analysis</h2>
              <p className="text-muted-foreground text-lg">
                Upload a PDF lab report to extract, standardize, and classify biomarkers automatically.
              </p>
            </div>
            
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer ${
                isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border bg-card hover:border-primary/50 hover:bg-secondary/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="application/pdf"
                className="hidden"
              />
              
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <UploadCloud className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-medium mb-2">Drag and drop your lab report</h3>
              <p className="text-muted-foreground mb-6">or click to browse from your computer (PDF only)</p>
              <Button size="lg" className="px-8 shadow-sm">
                Select PDF File
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {analyzeMutation.isPending && (
          <div className="max-w-xl mx-auto mt-24 text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-card border rounded-full flex items-center justify-center shadow-sm animate-pulse">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-serif">Analyzing Report</h3>
              <p className="text-muted-foreground">Extracting and standardizing biomarkers...</p>
            </div>
            <Progress value={45} className="h-2 w-full max-w-md mx-auto" />
          </div>
        )}

        {/* Results State */}
        {result && !analyzeMutation.isPending && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold font-serif">Analysis Results</h2>
              <Button variant="outline" onClick={() => { setFile(null); analyzeMutation.reset(); }}>
                Analyze Another Report
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="col-span-1 md:col-span-4 bg-primary/5 border-primary/20 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Patient Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Name</p>
                      <p className="font-medium text-foreground">{result.patient.name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Age / Sex</p>
                      <p className="font-medium text-foreground">
                        {result.patient.age ? `${result.patient.age} yrs` : 'Unknown'} 
                        {result.patient.sex ? ` / ${result.patient.sex}` : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Report Date</p>
                      <p className="font-medium text-foreground">{result.patient.reportDate || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Laboratory</p>
                      <p className="font-medium text-foreground">{result.patient.labName || 'Unknown'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Cards */}
              <Card className="shadow-sm">
                <CardContent className="p-6 flex flex-col justify-center items-center text-center">
                  <div className="p-3 bg-secondary rounded-full mb-3 text-secondary-foreground">
                    <Activity className="h-6 w-6" />
                  </div>
                  <p className="text-3xl font-bold">{result.summary.total}</p>
                  <p className="text-muted-foreground text-sm font-medium">Total Biomarkers</p>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm border-optimal/20">
                <CardContent className="p-6 flex flex-col justify-center items-center text-center">
                  <div className="p-3 bg-optimal/10 rounded-full mb-3 text-optimal">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <p className="text-3xl font-bold text-optimal">{result.summary.optimal}</p>
                  <p className="text-muted-foreground text-sm font-medium">Optimal</p>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm border-normal/20">
                <CardContent className="p-6 flex flex-col justify-center items-center text-center">
                  <div className="p-3 bg-normal/10 rounded-full mb-3 text-normal">
                    <HeartPulse className="h-6 w-6" />
                  </div>
                  <p className="text-3xl font-bold text-normal">{result.summary.normal}</p>
                  <p className="text-muted-foreground text-sm font-medium">Normal</p>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm border-out-of-range/20">
                <CardContent className="p-6 flex flex-col justify-center items-center text-center">
                  <div className="p-3 bg-out-of-range/10 rounded-full mb-3 text-out-of-range">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <p className="text-3xl font-bold text-out-of-range">{result.summary.outOfRange}</p>
                  <p className="text-muted-foreground text-sm font-medium">Out of Range</p>
                </CardContent>
              </Card>
            </div>

            {/* Biomarker Table */}
            <Card className="shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/50">
                    <TableRow>
                      <TableHead className="w-[300px]">
                        <button 
                          className="flex items-center gap-1 font-medium hover:text-primary transition-colors"
                          onClick={() => handleSort('standardizedName')}
                        >
                          Biomarker
                          {sortField === 'standardizedName' && (
                            sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Reference Range</TableHead>
                      <TableHead>
                        <button 
                          className="flex items-center gap-1 font-medium hover:text-primary transition-colors"
                          onClick={() => handleSort('classification')}
                        >
                          Status
                          {sortField === 'classification' && (
                            sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="hidden md:table-cell w-[300px]">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedBiomarkers.map((biomarker, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div className="font-medium text-foreground">{biomarker.standardizedName}</div>
                          <div className="text-xs text-muted-foreground mt-0.5" title="Original Name in Report">
                            <span className="opacity-70">Orig:</span> {biomarker.originalName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-semibold">{biomarker.value}</span>
                            <span className="text-sm text-muted-foreground">{biomarker.standardizedUnit}</span>
                          </div>
                          {biomarker.originalUnit !== biomarker.standardizedUnit && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              <span className="opacity-70">Orig:</span> {biomarker.value} {biomarker.originalUnit}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {biomarker.referenceMin !== null && biomarker.referenceMax !== null 
                              ? `${biomarker.referenceMin} - ${biomarker.referenceMax} ${biomarker.standardizedUnit}`
                              : biomarker.referenceMin !== null
                                ? `> ${biomarker.referenceMin} ${biomarker.standardizedUnit}`
                                : biomarker.referenceMax !== null
                                  ? `< ${biomarker.referenceMax} ${biomarker.standardizedUnit}`
                                  : 'Not specified'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(biomarker.classification)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground leading-relaxed">
                          {biomarker.classificationDetail}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

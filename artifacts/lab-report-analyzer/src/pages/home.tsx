import React, { useState, useCallback, useRef, useEffect } from "react";
import { useAnalyzeReport, useGetAiProviders, useHealthCheck } from "@workspace/api-client-react";
import {
  UploadCloud, FileText, CheckCircle, AlertCircle, Activity, HeartPulse,
  Stethoscope, ChevronDown, ChevronUp, Loader2, ShieldCheck, FileWarning,
  RefreshCw, User, Calendar, Building2, Cpu, Filter, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LOADING_STEPS = [
  { label: "Extracting Text", description: "Reading and parsing your PDF document...", icon: FileText },
  { label: "AI Analysis", description: "Identifying and standardizing biomarkers...", icon: Cpu },
  { label: "Classification", description: "Classifying results by age and sex...", icon: ShieldCheck },
];

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>("standardizedName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: healthStatus } = useHealthCheck();
  const { data: aiProviders } = useGetAiProviders();
  const analyzeMutation = useAnalyzeReport();

  useEffect(() => {
    if (!analyzeMutation.isPending) {
      setLoadingStep(0);
      return;
    }
    setLoadingStep(0);
    const t1 = setTimeout(() => setLoadingStep(1), 2000);
    const t2 = setTimeout(() => setLoadingStep(2), 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [analyzeMutation.isPending]);

  const validateAndSetFile = (f: File) => {
    setFileError(null);
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setFileError("Only PDF files are supported. Please select a valid lab report PDF.");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setFileError("File is too large. Maximum size is 20 MB.");
      return;
    }
    if (f.size < 100) {
      setFileError("File appears to be empty or corrupted.");
      return;
    }
    setFile(f);
    handleUpload(f);
  };

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
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  }, []);

  const handleUpload = (uploadFile: File) => {
    setFileError(null);
    analyzeMutation.mutate({ data: { file: uploadFile } } as any);
  };

  const handleRetry = () => {
    if (file) {
      handleUpload(file);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileError(null);
    setStatusFilter(null);
    analyzeMutation.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
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

  const filteredBiomarkers = React.useMemo(() => {
    if (!result?.biomarkers) return [];
    let items = [...result.biomarkers];
    if (statusFilter) {
      items = items.filter((b: any) => b.classification === statusFilter);
    }
    return items.sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [result?.biomarkers, sortField, sortOrder, statusFilter]);

  const groupedBiomarkers = React.useMemo(() => {
    const groups: Record<string, typeof filteredBiomarkers> = {};
    for (const b of filteredBiomarkers) {
      const cat = (b as any).category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(b);
    }
    return groups;
  }, [filteredBiomarkers]);

  const getStatusBadge = (classification: string) => {
    switch (classification) {
      case "optimal":
        return <Badge className="bg-optimal hover:bg-optimal/90 text-optimal-foreground border-transparent">Optimal</Badge>;
      case "normal":
        return <Badge className="bg-normal hover:bg-normal/90 text-normal-foreground border-transparent">Normal</Badge>;
      case "out_of_range":
        return <Badge className="bg-out-of-range hover:bg-out-of-range/90 text-out-of-range-foreground border-transparent">Out of Range</Badge>;
      default:
        return <Badge variant="outline">{classification}</Badge>;
    }
  };

  const getSexIcon = (sex: string | null | undefined) => {
    if (!sex) return null;
    const s = sex.toLowerCase();
    if (s === "male" || s === "m") return <span className="text-lg">♂</span>;
    if (s === "female" || s === "f") return <span className="text-lg">♀</span>;
    return <span className="text-lg">⚧</span>;
  };

  const summaryBarSegments = result ? [
    { key: "optimal", count: result.summary.optimal, label: "Optimal", className: "bg-optimal" },
    { key: "normal", count: result.summary.normal, label: "Normal", className: "bg-normal" },
    { key: "outOfRange", count: result.summary.outOfRange, label: "Out of Range", className: "bg-out-of-range" },
  ] : [];

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
                <div className="h-2 w-2 rounded-full bg-optimal animate-pulse"></div>
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

        {!result && !analyzeMutation.isPending && !analyzeMutation.isError && (
          <div className="max-w-2xl mx-auto mt-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-serif text-card-foreground mb-3">Clinical Biomarker Analysis</h2>
              <p className="text-muted-foreground text-lg">
                Upload a PDF lab report to extract, standardize, and classify biomarkers automatically.
              </p>
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer ${
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.02] shadow-lg"
                  : fileError
                    ? "border-destructive bg-destructive/5"
                    : "border-border bg-card hover:border-primary/50 hover:bg-secondary/50"
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

              {fileError ? (
                <>
                  <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <FileWarning className="h-8 w-8 text-destructive" />
                  </div>
                  <h3 className="text-xl font-medium mb-2 text-destructive">Invalid File</h3>
                  <p className="text-muted-foreground mb-4">{fileError}</p>
                  <Button size="lg" variant="outline" className="px-8" onClick={(e) => { e.stopPropagation(); setFileError(null); }}>
                    Try Again
                  </Button>
                </>
              ) : (
                <>
                  <div className={`mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 transition-transform duration-200 ${isDragging ? "scale-110" : ""}`}>
                    <UploadCloud className={`h-8 w-8 text-primary transition-transform duration-200 ${isDragging ? "-translate-y-1" : ""}`} />
                  </div>
                  <h3 className="text-xl font-medium mb-2">Drag and drop your lab report</h3>
                  <p className="text-muted-foreground mb-2">or click to browse from your computer</p>
                  <p className="text-xs text-muted-foreground mb-6">PDF only &middot; Max 20 MB</p>
                  <Button size="lg" className="px-8 shadow-sm">
                    Select PDF File
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {analyzeMutation.isPending && (
          <div className="max-w-lg mx-auto mt-20 space-y-8">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-serif">Analyzing Report</h3>
              <p className="text-muted-foreground text-sm">{file?.name}</p>
            </div>

            <div className="space-y-4">
              {LOADING_STEPS.map((step, idx) => {
                const isActive = idx === loadingStep;
                const isDone = idx < loadingStep;
                const Icon = step.icon;
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-all duration-500 ${
                      isActive
                        ? "bg-primary/5 border-primary/30 shadow-sm"
                        : isDone
                          ? "bg-optimal/5 border-optimal/20"
                          : "bg-card border-border opacity-50"
                    }`}
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isActive
                        ? "bg-primary/15 text-primary"
                        : isDone
                          ? "bg-optimal/15 text-optimal"
                          : "bg-muted text-muted-foreground"
                    }`}>
                      {isActive ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : isDone ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${isActive ? "text-primary" : isDone ? "text-optimal" : "text-muted-foreground"}`}>
                        Step {idx + 1}: {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {analyzeMutation.isError && !analyzeMutation.isPending && (
          <div className="max-w-lg mx-auto mt-20 text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-destructive/10 border border-destructive/20 rounded-full flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-serif text-foreground">Analysis Failed</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {(analyzeMutation.error as any)?.message || "Something went wrong while analyzing your report. This could be due to an unreadable PDF or a temporary server issue."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={handleReset}>
                <UploadCloud className="h-4 w-4 mr-2" />
                Upload Different File
              </Button>
              <Button onClick={handleRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Analysis
              </Button>
            </div>
          </div>
        )}

        {result && !analyzeMutation.isPending && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold font-serif">Analysis Results</h2>
              <Button variant="outline" onClick={handleReset}>
                Analyze Another Report
              </Button>
            </div>

            <Card className="shadow-sm border-primary/20 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4 border-b border-primary/10">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Patient Information
                </CardTitle>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wider font-medium">Name</p>
                    <p className="font-semibold text-foreground">{result.patient.name || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wider font-medium">Age</p>
                    <p className="font-semibold text-foreground">
                      {result.patient.age ? `${result.patient.age} years` : "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wider font-medium">Sex</p>
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      {getSexIcon(result.patient.sex)}
                      {result.patient.sex || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wider font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Report Date
                    </p>
                    <p className="font-semibold text-foreground">{result.patient.reportDate || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wider font-medium flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> Laboratory
                    </p>
                    <p className="font-semibold text-foreground">{result.patient.labName || "Unknown"}</p>
                  </div>
                </div>
                {currentProvider && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <span className="inline-flex items-center gap-1.5 text-xs bg-secondary px-2.5 py-1 rounded-full text-muted-foreground border border-border">
                      <Cpu className="h-3 w-3" />
                      Analyzed with {currentProvider.name}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="shadow-sm">
                <CardContent className="p-5 flex flex-col justify-center items-center text-center">
                  <div className="p-2.5 bg-secondary rounded-full mb-2.5 text-secondary-foreground">
                    <Activity className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-bold">{result.summary.total}</p>
                  <p className="text-muted-foreground text-xs font-medium mt-1">Total Biomarkers</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-optimal/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(statusFilter === "optimal" ? null : "optimal")}>
                <CardContent className="p-5 flex flex-col justify-center items-center text-center">
                  <div className="p-2.5 bg-optimal/10 rounded-full mb-2.5 text-optimal">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-bold text-optimal">{result.summary.optimal}</p>
                  <p className="text-muted-foreground text-xs font-medium mt-1">Optimal</p>
                  {statusFilter === "optimal" && <div className="w-full h-0.5 bg-optimal rounded mt-2" />}
                </CardContent>
              </Card>
              <Card className="shadow-sm border-normal/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(statusFilter === "normal" ? null : "normal")}>
                <CardContent className="p-5 flex flex-col justify-center items-center text-center">
                  <div className="p-2.5 bg-normal/10 rounded-full mb-2.5 text-normal">
                    <HeartPulse className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-bold text-normal">{result.summary.normal}</p>
                  <p className="text-muted-foreground text-xs font-medium mt-1">Normal</p>
                  {statusFilter === "normal" && <div className="w-full h-0.5 bg-normal rounded mt-2" />}
                </CardContent>
              </Card>
              <Card className="shadow-sm border-out-of-range/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(statusFilter === "out_of_range" ? null : "out_of_range")}>
                <CardContent className="p-5 flex flex-col justify-center items-center text-center">
                  <div className="p-2.5 bg-out-of-range/10 rounded-full mb-2.5 text-out-of-range">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-bold text-out-of-range">{result.summary.outOfRange}</p>
                  <p className="text-muted-foreground text-xs font-medium mt-1">Out of Range</p>
                  {statusFilter === "out_of_range" && <div className="w-full h-0.5 bg-out-of-range rounded mt-2" />}
                </CardContent>
              </Card>
            </div>

            {result.summary.total > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Results Distribution</span>
                  <span>{result.summary.total} biomarkers</span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                  {summaryBarSegments.map(seg => seg.count > 0 && (
                    <div
                      key={seg.key}
                      className={`${seg.className} transition-all duration-500`}
                      style={{ width: `${(seg.count / result.summary.total) * 100}%` }}
                      title={`${seg.label}: ${seg.count}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {summaryBarSegments.map(seg => (
                    <span key={seg.key} className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${seg.className}`} />
                      {seg.label} ({seg.count})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {statusFilter && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filtered by:</span>
                <Badge variant="secondary" className="gap-1">
                  {statusFilter === "optimal" ? "Optimal" : statusFilter === "normal" ? "Normal" : "Out of Range"}
                  <button onClick={() => setStatusFilter(null)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            )}

            {Object.entries(groupedBiomarkers).map(([category, biomarkers]) => (
              <Card key={category} className="shadow-sm overflow-hidden">
                <div className="bg-secondary/50 px-6 py-3 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-foreground">{category}</h3>
                  <span className="text-xs text-muted-foreground">{biomarkers.length} biomarker{biomarkers.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[280px]">
                          <button
                            className="flex items-center gap-1 font-medium hover:text-primary transition-colors"
                            onClick={() => handleSort("standardizedName")}
                          >
                            Biomarker
                            {sortField === "standardizedName" && (
                              sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Reference Range</TableHead>
                        <TableHead>
                          <button
                            className="flex items-center gap-1 font-medium hover:text-primary transition-colors"
                            onClick={() => handleSort("classification")}
                          >
                            Status
                            {sortField === "classification" && (
                              sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </TableHead>
                        <TableHead className="hidden md:table-cell w-[280px]">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {biomarkers.map((biomarker, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/50 transition-colors">
                          <TableCell>
                            <div className="font-medium text-foreground">{biomarker.standardizedName}</div>
                            {biomarker.originalName !== biomarker.standardizedName && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                <span className="opacity-70">Orig:</span> {biomarker.originalName}
                              </div>
                            )}
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
                              {biomarker.referenceMin != null && biomarker.referenceMax != null
                                ? `${biomarker.referenceMin} – ${biomarker.referenceMax} ${biomarker.standardizedUnit}`
                                : biomarker.referenceMin != null
                                  ? `> ${biomarker.referenceMin} ${biomarker.standardizedUnit}`
                                  : biomarker.referenceMax != null
                                    ? `< ${biomarker.referenceMax} ${biomarker.standardizedUnit}`
                                    : "Not specified"}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(biomarker.classification)}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground leading-relaxed">
                            {biomarker.classificationDetail}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ))}

            {filteredBiomarkers.length === 0 && statusFilter && (
              <div className="text-center py-12 text-muted-foreground">
                <Filter className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>No biomarkers match the selected filter.</p>
                <Button variant="link" className="mt-2" onClick={() => setStatusFilter(null)}>Clear filter</Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

import { useState, useRef } from "react";
import { UploadCloud, FileArchive, CheckCircle2, AlertCircle, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const STRIPPED_ITEMS = [
  ".replit",
  "replit.nix",
  ".cache/",
  ".upm/",
  ".breakpoints",
  ".config/configstore/",
  "generated/",
  "__pycache__/",
  ".pythonlibs/"
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/zip" || droppedFile.name.endsWith(".zip")) {
        setFile(droppedFile);
        setSuccess(false);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a .zip file.",
          variant: "destructive"
        });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setSuccess(false);
    }
  };

  const handleStrip = async () => {
    if (!file) return;

    setIsProcessing(true);
    setSuccess(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/strip", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text() || "Failed to process the zip file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Determine new filename
      const originalName = file.name;
      const baseName = originalName.endsWith(".zip") 
        ? originalName.slice(0, -4) 
        : originalName;
      const newFilename = `${baseName}_clean.zip`;

      // Trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = newFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(true);
      toast({
        title: "Success",
        description: "Project successfully stripped and downloaded.",
      });
    } catch (error: any) {
      toast({
        title: "Processing Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 lg:p-12 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 relative z-10">
        
        {/* Left Column: Info */}
        <div className="lg:col-span-2 flex flex-col justify-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 text-primary font-mono text-sm tracking-tight font-medium bg-primary/10 px-3 py-1 rounded-sm border border-primary/20">
              <FileArchive className="w-4 h-4" />
              <span>REPLIT_STRIPPER_v1.0</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Purge the Replit junk.
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              Drop a Replit project zip into the washer. We will strip out the environment-specific configs, caches, and generated files, returning a clean, portable codebase ready for local development or deployment anywhere.
            </p>
          </div>

          <div className="space-y-3 bg-card border border-card-border p-5 rounded-md shadow-sm">
            <h3 className="text-sm font-semibold text-foreground flex items-center">
              <span className="bg-primary/20 text-primary p-1 rounded mr-2">
                <AlertCircle className="w-3 h-3" />
              </span>
              Target Signatures
            </h3>
            <ul className="grid grid-cols-1 gap-2 font-mono text-xs text-muted-foreground">
              {STRIPPED_ITEMS.map((item, i) => (
                <li key={i} className="flex items-center space-x-2 before:content-['>_'] before:text-primary/50">
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Dropzone & Action */}
        <div className="lg:col-span-3 flex flex-col space-y-6">
          <div 
            className={`
              relative flex flex-col items-center justify-center w-full h-[400px] rounded-lg border-2 border-dashed transition-all duration-200 ease-in-out group
              ${isDragging 
                ? "border-primary bg-primary/5 scale-[1.02]" 
                : file 
                  ? success 
                    ? "border-primary/50 bg-card" 
                    : "border-muted-foreground/30 bg-card hover:border-primary/50" 
                  : "border-border bg-card hover:border-primary/50 hover:bg-card/80"}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept=".zip,application/zip" 
              className="hidden" 
            />

            {!file ? (
              <div className="flex flex-col items-center justify-center text-center space-y-4 p-8 cursor-pointer">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <UploadCloud className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-medium text-foreground">Select or drop a .zip file</p>
                  <p className="text-sm text-muted-foreground font-mono">max 500mb limit</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center space-y-6 p-8 w-full">
                {success ? (
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-2 animate-in zoom-in duration-300">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                ) : isProcessing ? (
                  <div className="w-20 h-20 flex items-center justify-center text-primary mb-2">
                    <Loader2 className="w-12 h-12 animate-spin" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-foreground mb-2">
                    <FileArchive className="w-10 h-10" />
                  </div>
                )}
                
                <div className="space-y-2 w-full px-8">
                  <p className="text-lg font-medium text-foreground truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>

                {success && (
                  <div className="text-sm text-primary font-medium flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Download triggered automatically</span>
                  </div>
                )}

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    resetState();
                  }}
                  disabled={isProcessing}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </div>

          <Button 
            size="lg" 
            className="w-full h-14 text-base font-mono font-bold tracking-widest uppercase transition-all"
            disabled={!file || isProcessing || success}
            onClick={handleStrip}
          >
            {isProcessing ? (
              <span className="flex items-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </span>
            ) : success ? (
              <span className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>Stripped Successfully</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <FileArchive className="w-5 h-5" />
                <span>Strip Project</span>
              </span>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Upload as UploadIcon, File, X, CheckCircle, Plus } from "lucide-react";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

interface UploadProps {
  user: any;
}

export default function Upload({ user }: UploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("Math");
  const [customSubject, setCustomSubject] = useState("");
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [subjects, setSubjects] = useState(['Math', 'Science', 'History', 'English', 'Art', 'Sports']);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      checkAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      checkAndSetFile(e.target.files[0]);
    }
  };

  const checkAndSetFile = (f: File) => {
    // 100MB limit for Firebase Storage
    if (f.size > 100 * 1024 * 1024) {
        setError("File is too large. Max size is 100MB.");
        setFile(null);
        return;
    }
    setError("");
    setFile(f);
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    // Fetch custom subjects if any
    const fetchSubjects = async () => {
      try {
        const snap = await getDocs(collection(db, "subjects"));
        if (!snap.empty) {
            const extra = snap.docs.map(d => d.data().name);
            setSubjects(prev => Array.from(new Set([...prev, ...extra])));
        }
      } catch (e) {
        console.error("Failed to load subjects", e);
      }
    };
    fetchSubjects();
  }, []);

  const sendNotification = (title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico" });
    }
  };

  const handleAddSubject = async () => {
    if (customSubject.trim() && !subjects.includes(customSubject.trim())) {
        const newSub = customSubject.trim();
        setSubjects([...subjects, newSub]);
        setSubject(newSub);
        setCustomSubject("");
        setIsAddingSubject(false);
        try {
            await addDoc(collection(db, "subjects"), { name: newSub });
        } catch (e) {
            console.error(e);
        }
    } else {
        setIsAddingSubject(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    
    setUploading(true);
    setUploadProgress(0);
    setError("");
    
    try {
        let type = 'image';
        if (file.type === 'application/pdf') type = 'pdf';
        else if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) type = 'word';
        else if (file.name.endsWith('.txt') || file.name.endsWith('.rtf') || file.name.endsWith('.md')) type = 'text';
        else if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) type = 'spreadsheet';
        else if (file.name.endsWith('.pptx')) type = 'presentation';
        
        const storageRef = ref(storage, `uploads/${user.uid}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            }, 
            (err) => {
                setUploading(false);
                setError(err.message || "Failed to upload to storage");
                console.error("Storage error", err);
            }, 
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                
                const mbSize = (file.size / 1024 / 1024).toFixed(2) + " MB";
        
                await addDoc(collection(db, "notes"), {
                    title: file.name.split('.').slice(0, -1).join('.') || file.name,
                    subject,
                    type,
                    fileUrl: downloadURL,
                    size: mbSize,
                    author: user.email,
                    authorId: user.uid,
                    createdAt: serverTimestamp()
                });
        
                setUploading(false);
                setSuccess(true);
                setUploadProgress(0);
                sendNotification("New Note Uploaded!", `${file.name} was shared.`);
                
                setTimeout(() => {
                  setFile(null);
                  setSuccess(false);
                }, 3000);
            }
        );

    } catch (err: any) {
        setUploading(false);
        setError(err.message || "Failed to upload");
        console.error("Upload error", err);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto flex flex-col h-full overflow-y-auto pb-24 md:pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Upload Files</h1>
        <p className="text-muted-foreground">Share study notes, PDFs, and images with the group.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        {success ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-green-500">
            <CheckCircle className="w-16 h-16 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Upload Successful!</h2>
            <p className="text-muted-foreground">Your file has been shared on the dashboard.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="p-3 mb-4 text-sm text-destructive bg-destructive/10 rounded-lg">{error}</div>}
            
            <div 
              className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors text-center
                ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleChange}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt,.rtf,.odt,.html,.pptx,.xlsx,.csv,.md"
              />
              
              <div className="bg-secondary p-4 rounded-full mb-4 pointer-events-none">
                <UploadIcon className="w-8 h-8 text-primary" />
              </div>
              <p className="text-lg font-medium mb-1 pointer-events-none">Drag and drop your file here</p>
              <p className="text-sm text-muted-foreground mb-4 pointer-events-none">or click to browse files</p>
              <p className="text-xs text-muted-foreground leading-loose pointer-events-none">Supports PDF, DOC, PPT, Excel, Images, Text <br/><span className="bg-secondary px-2 py-1 rounded text-foreground font-semibold">Max size: 100MB</span></p>
            </div>

            {file && (
              <div className="bg-secondary/50 rounded-lg p-4 flex items-center justify-between border border-border">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <File className="w-6 h-6 text-primary shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-2 hover:bg-secondary rounded-full text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Select Subject</label>
                <button
                  type="button"
                  onClick={() => setIsAddingSubject(!isAddingSubject)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Custom
                </button>
              </div>
              
              {isAddingSubject && (
                <div className="flex gap-2 mb-2">
                  <input 
                    type="text" 
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder="E.g. Biology"
                    className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
                  />
                  <button type="button" onClick={handleAddSubject} className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium">Add</button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {subjects.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubject(sub)}
                    className={`py-1.5 px-3 rounded-full border text-sm font-medium transition-all ${
                      subject === sub
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-secondary text-muted-foreground"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full bg-foreground text-background font-medium py-3 rounded-lg flex justify-center items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-4 relative overflow-hidden"
            >
              {uploading && (
                  <div className="absolute left-0 top-0 bottom-0 bg-primary/20" style={{ width: `${uploadProgress}%` }}></div>
              )}
              <span className="relative flex items-center gap-2">
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
                      Uploading {Math.round(uploadProgress)}%...
                    </>
                  ) : (
                    <>
                      <UploadIcon className="w-4 h-4" />
                      Upload Note
                    </>
                  )}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

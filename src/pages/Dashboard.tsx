import { useState, useEffect } from "react";
import { FileText, Image as ImageIcon, Search, Download, Trash2, FolderOpen, Share2, Eye, X, Check } from "lucide-react";
import { cn } from "../lib/utils";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { collection, onSnapshot, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

interface DashboardProps {
  user: any;
}

export default function Dashboard({ user }: DashboardProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [previewNote, setPreviewNote] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [subjects, setSubjects] = useState(['All', 'Math', 'Science', 'History', 'English', 'Art', 'Sports']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "notes"), orderBy("createdAt", "desc"));
    const unsubscribeNotes = onSnapshot(q, (snapshot) => {
      const fetchedNotes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotes(fetchedNotes);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error: ", error);
      setLoading(false);
    });

    const unsubscribeSubjects = onSnapshot(collection(db, "subjects"), (snap) => {
      if (!snap.empty) {
          const extra = snap.docs.map(d => d.data().name);
          setSubjects(prev => {
             const base = ['All', 'Math', 'Science', 'History', 'English', 'Art', 'Sports'];
             const allSubs = new Set([...base, ...extra]);
             return Array.from(allSubs);
          });
      }
    });

    return () => {
      unsubscribeNotes();
      unsubscribeSubjects();
    }
  }, []);

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "All" || note.subject === filter;
    return matchesSearch && matchesFilter;
  });

  const handleDownloadAll = async () => {
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      
      // For real implementation we'd fetch the files from note.fileUrl.
      // Since fileUrl is currently simulated, we will make mock blobs.
      for (const note of filteredNotes) {
        if (note.fileUrl.startsWith('data:')) {
            const res = await fetch(note.fileUrl);
            const blob = await res.blob();
            zip.file(`${note.title}.${note.type === 'pdf' ? 'pdf' : 'jpg'}`, blob);
        } else {
            zip.file(`${note.title}.${note.type === 'pdf' ? 'pdf' : 'jpg'}`, `Dummy content for ${note.title}`);
        }
      }
      
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "FLY_Study_Notes.zip");
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleShare = (noteId: string) => {
    const link = `${window.location.origin}?noteId=${noteId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(noteId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (noteId: string) => {
    if (confirm("Are you sure you want to delete this note?")) {
      try {
        await deleteDoc(doc(db, "notes", noteId));
      } catch (e) {
        console.error("Error deleting document: ", e);
        alert("Failed to delete note.");
      }
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto flex flex-col h-full overflow-y-auto pb-24 md:pb-10 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">📚 Your Study Materials</h1>
          <p className="text-muted-foreground">Welcome, {user.email}!</p>
        </div>
        <button 
          onClick={handleDownloadAll}
          disabled={downloadingZip || filteredNotes.length === 0}
          className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium py-2.5 px-5 rounded-lg flex items-center justify-center gap-2 transition-colors shrink-0 shadow-sm"
        >
          {downloadingZip ? (
            <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Download className="w-4 h-4" />
          )}
          Download All ({filteredNotes.length})
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8">
        <div className="flex space-x-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
          {subjects.map(subj => (
            <button
              key={subj}
              onClick={() => setFilter(subj)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                filter === subj 
                  ? "bg-foreground text-background shadow-sm" 
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {subj}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-full py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="col-span-full py-16 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredNotes.map((note) => (
            <div key={note.id} className="group bg-card border border-border hover:border-primary/50 rounded-xl p-5 transition-all shadow-sm hover:shadow-md flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                  {note.type === "pdf" ? (
                    <FileText className="w-6 h-6 text-red-500" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-blue-500" />
                  )}
                </div>
                <span className="text-[10px] font-semibold tracking-wider uppercase bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
                  {note.subject}
                </span>
              </div>

              <h3 className="font-semibold text-lg line-clamp-2 leading-tight mb-2 group-hover:text-primary transition-colors cursor-pointer" onClick={() => setPreviewNote(note)}>
                {note.title}
              </h3>
              
              <div className="text-xs text-muted-foreground space-y-1 mt-auto">
                <p>Uploaded by {note.author === user.email ? 'you' : note.author}</p>
                <p>{new Date(note.createdAt?.toMillis ? note.createdAt.toMillis() : Date.now()).toLocaleDateString()} • {note.size}</p>
              </div>

              <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border">
                <button 
                  onClick={() => setPreviewNote(note)}
                  className="flex-[0.5] flex items-center justify-center gap-2 bg-secondary/50 hover:bg-secondary text-foreground py-2 rounded-md text-sm font-medium transition-colors"
                  title="Preview"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button 
                  className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-md text-sm font-bold transition-colors shadow-sm"
                  onClick={async () => {
                   if (note.fileUrl.startsWith('data:')) {
                       // it's a base64 blob 
                       saveAs(note.fileUrl, `${note.title}.${note.type === 'pdf' ? 'pdf' : 'jpg'}`);
                   } else {
                       const blob = new Blob([`Dummy content for ${note.title}`], { type: "text/plain" });
                       saveAs(blob, `${note.title}.${note.type === 'pdf' ? 'pdf' : 'jpg'}`);
                   }
                  }}
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button 
                  onClick={() => handleShare(note.id)}
                  className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors" 
                  title="Share Link"
                >
                  {copiedId === note.id ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                </button>
                {(user.role === "admin" || note.author === user.email) && (
                  <button onClick={() => handleDelete(note.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredNotes.length === 0 && (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed border-border rounded-2xl">
              <FolderOpen className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium text-foreground">No notes found.</p>
              <p className="text-sm">Try adjusting your search or filter.</p>
            </div>
          )}
        </div>
      )}

      {previewNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  {previewNote.type === "pdf" ? <FileText className="w-5 h-5 text-red-500" /> : <ImageIcon className="w-5 h-5 text-blue-500" />}
                </div>
                <div>
                  <h3 className="font-semibold">{previewNote.title}</h3>
                  <p className="text-xs text-muted-foreground">{previewNote.subject} • {previewNote.size}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleShare(previewNote.id)}
                  className="p-2 hover:bg-secondary rounded-full transition-colors flex items-center gap-2"
                >
                   {copiedId === previewNote.id ? <Check className="w-5 h-5 text-green-500" /> : <Share2 className="w-5 h-5 text-muted-foreground" />}
                </button>
                <button 
                  onClick={() => setPreviewNote(null)}
                  className="p-2 hover:bg-secondary rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-secondary/30 p-8 flex items-center justify-center overflow-auto min-h-[50vh]">
              <div className="bg-background w-full max-w-2xl min-h-[600px] border border-border rounded-lg shadow-sm flex flex-col items-center justify-center p-8 text-center overflow-hidden">
                {previewNote.type === "pdf" ? (
                  <>
                    <FileText className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                    <p className="text-lg font-medium">PDF Document {previewNote.fileUrl.startsWith('data:') ? 'Preview Unavailable' : 'Preview'}</p>
                    <p className="text-muted-foreground mt-2">"{previewNote.title}"</p>
                    <div className="mt-4"><button className="text-primary hover:underline" onClick={() => saveAs(previewNote.fileUrl, `${previewNote.title}.pdf`)}>Download to view</button></div>
                  </>
                ) : (
                  <>
                    {previewNote.fileUrl.startsWith('data:image') ? (
                       <img src={previewNote.fileUrl} alt={previewNote.title} className="max-w-full max-h-[600px] object-contain rounded" />
                    ) : (
                        <>
                            <ImageIcon className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                            <p className="text-lg font-medium">Image Preview</p>
                            <p className="text-muted-foreground mt-2">"{previewNote.title}"</p>
                        </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

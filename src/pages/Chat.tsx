import React, { useState, useRef, useEffect } from "react";
import { Send, Image as ImageIcon, Paperclip, FileEdit, MessageSquare, UserPlus, File, X } from "lucide-react";
import { cn } from "../lib/utils";
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

interface ChatProps {
  user: any;
}

export default function Chat({ user }: ChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [mode, setMode] = useState<"chat" | "document">("chat");
  const [documentContent, setDocumentContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  // Attachments
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [attachment, setAttachment] = useState<{file: File, type: 'image' | 'file'} | null>(null);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const q = query(collection(db, "chat_messages"), orderBy("createdAt", "asc"));
    const unsubscribeChat = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        isMe: doc.data().senderId === user.uid,
        ...doc.data()
      }));
      setMessages(fetched);
    });

    const docRef = doc(db, "documents", "global_shared_doc");
    const unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().lastUpdaterId !== user.uid) {
         setDocumentContent(docSnap.data().content);
      }
    });

    getDoc(docRef).then(snap => {
       if (!snap.exists()) {
           setDoc(docRef, {
               content: "## Live Notes\nStart typing collaboratively...",
               lastUpdaterId: user.uid,
               updatedAt: serverTimestamp()
           });
       } else {
           setDocumentContent(snap.data().content);
       }
    });

    return () => {
      unsubscribeChat();
      unsubscribeDoc();
    };
  }, [user.uid]);

  useEffect(() => {
    if (mode === "chat") {
      endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, mode]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !attachment) return;
    
    setUploadingMedia(true);
    let mediaUrl = null;
    let mediaType = null;
    let mediaName = null;

    if (attachment) {
      try {
        const storageRef = ref(storage, `chat_uploads/${user.uid}/${Date.now()}_${attachment.file.name}`);
        const uploadTask = await uploadBytesResumable(storageRef, attachment.file);
        mediaUrl = await getDownloadURL(uploadTask.ref);
        mediaType = attachment.type;
        mediaName = attachment.file.name;
      } catch (e) {
        console.error("Upload failed", e);
        setUploadingMedia(false);
        return;
      }
    }

    const textToSend = newMessage;
    setNewMessage("");
    setAttachment(null);

    const senderName = user.displayName || user.email;

    try {
        await addDoc(collection(db, "chat_messages"), {
            text: textToSend,
            sender: senderName,
            senderId: user.uid,
            mediaUrl,
            mediaType,
            mediaName,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: serverTimestamp()
        });
    } catch (err: any) {
        console.error("Failed to send message: ", err);
    } finally {
        setUploadingMedia(false);
    }
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDocumentContent(val);
    setIsTyping(true);
    
    setTimeout(() => {
        setIsTyping(false);
        setDoc(doc(db, "documents", "global_shared_doc"), {
            content: val,
            lastUpdaterId: user.uid,
            updatedAt: serverTimestamp()
        }, { merge: true }).catch(err => console.error("Sync error", err));
    }, 1000);
  };

  const inviteUser = () => {
    const link = `${window.location.origin}/chat`;
    navigator.clipboard.writeText(link);
    alert(`Invite link copied to clipboard!\n${link}\n\nSend this to anyone you want to join the chat.`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    if (e.target.files && e.target.files[0]) {
      setAttachment({ file: e.target.files[0], type });
    }
    // reset input
    if (e.target) e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border md:border-l-0 pb-16 md:pb-0 relative">
      <div className="flex items-center justify-between p-4 border-b border-border bg-card shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center relative">
            <span className="text-xl">💬</span>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full"></span>
          </div>
          <div>
            <h2 className="font-bold">Study Group</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Discuss and collaborate with friends
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={inviteUser} className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors flex items-center gap-1" title="Invite Person">
            <UserPlus className="w-5 h-5" />
          </button>
          
          <div className="flex bg-secondary rounded-lg p-1 ml-2">
            <button 
              onClick={() => setMode("chat")}
              className={cn(
                "p-2 text-sm rounded-md transition-all flex items-center gap-2", 
                mode === "chat" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              title="Chat"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
            </button>
            <button 
              onClick={() => setMode("document")}
              className={cn(
                "p-2 text-sm rounded-md transition-all flex items-center gap-2", 
                mode === "document" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              title="Live Document"
            >
              <FileEdit className="w-4 h-4" />
              <span className="hidden sm:inline">Live Notes</span>
            </button>
          </div>
        </div>
      </div>

      {mode === "chat" ? (
        <>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-hide pb-32">
            {messages.map((msg, i) => {
              const isConsecutive = i > 0 && messages[i - 1].sender === msg.sender;
              return (
                <div key={msg.id} className={cn("flex flex-col", msg.isMe ? "items-end" : "items-start")}>
                  {!isConsecutive && (
                    <span className="text-xs font-medium text-muted-foreground mb-1 ml-1 mr-1">
                      {msg.isMe ? "You" : msg.sender}
                    </span>
                  )}
                  <div className="flex max-w-[85%] md:max-w-[70%] items-end gap-2 group">
                    <div 
                      className={cn(
                        "px-4 py-2.5 rounded-2xl relative shadow-sm",
                        msg.isMe 
                          ? "bg-primary text-primary-foreground rounded-br-sm" 
                          : "bg-secondary text-secondary-foreground rounded-bl-sm"
                      )}
                    >
                      {msg.mediaUrl && msg.mediaType === 'image' && (
                        <div className="mb-2 rounded-lg overflow-hidden border border-white/20">
                          <img src={msg.mediaUrl} alt="attachment" className="max-w-full max-h-60 object-cover" />
                        </div>
                      )}
                      {msg.mediaUrl && msg.mediaType === 'file' && (
                        <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className={cn("mb-2 flex items-center gap-2 p-2 rounded-lg border", msg.isMe ? "bg-white/10 border-white/20 hover:bg-white/20 text-white" : "bg-background/50 border-border hover:bg-background/80 text-foreground")}>
                            <File className="w-5 h-5 shrink-0" />
                            <span className="text-sm truncate w-48">{msg.mediaName || "Attachment"}</span>
                        </a>
                      )}
                      {msg.text && <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 opacity-60 ml-1 mr-1">
                    {msg.time}
                  </span>
                </div>
              );
            })}
            <div ref={endOfMessagesRef} />
          </div>

          <div className="p-4 bg-card border-t border-border shrink-0 pb-safe pb-4 absolute bottom-0 left-0 right-0 z-10 w-full mb-16 md:mb-0">
            {attachment && (
              <div className="max-w-4xl mx-auto mb-2 flex items-center justify-between bg-secondary p-2 rounded-lg border border-border">
                <div className="flex items-center gap-2 overflow-hidden">
                  <File className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-medium truncate">{attachment.file.name}</span>
                </div>
                <button onClick={() => setAttachment(null)} className="text-muted-foreground hover:text-foreground">
                   <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <form onSubmit={handleSend} className="flex items-end gap-2 max-w-4xl mx-auto">
              <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'file')} accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.html,.pptx,.xlsx,.csv,.md" />
              <input type="file" ref={imageInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'image')} accept="image/*" />
              
              <div className="flex-1 border border-input bg-background focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent rounded-2xl flex items-end transition-all">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                  <Paperclip className="w-5 h-5" />
                </button>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 max-h-32 min-h-[44px] bg-transparent resize-none py-3 outline-none focus:ring-0 text-sm"
                  rows={1}
                />
                <button type="button" onClick={() => imageInputRef.current?.click()} className="p-3 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </button>
              </div>
              <button 
                type="submit" 
                disabled={(!newMessage.trim() && !attachment) || uploadingMedia}
                className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all shadow-md active:scale-95"
              >
                {uploadingMedia ? <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div> : <Send className="w-5 h-5 ml-1" />}
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col pt-4 bg-secondary/10 pb-safe">
          <div className="flex-1 p-4 md:p-8 max-w-4xl w-full mx-auto flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Live Collaborative Session</h3>
              <div className="flex items-center gap-2">
                {isTyping ? (
                 <span className="text-xs text-muted-foreground animate-pulse">Syncing...</span> 
                ) : (
                 <span className="text-xs text-green-500">All changes saved</span>
                )}
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-background flex items-center justify-center font-bold text-xs shadow-sm">U</div>
                  <div className="w-8 h-8 rounded-full bg-red-500 border-2 border-background flex items-center justify-center font-bold text-xs shadow-sm">A</div>
                </div>
              </div>
            </div>
            <textarea 
               value={documentContent}
               onChange={handleDocChange}
               className="flex-1 w-full bg-card border border-border rounded-xl p-6 md:p-10 text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm resize-none font-mono"
               placeholder="Start typing your live notes here..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

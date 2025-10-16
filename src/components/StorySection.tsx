import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface Story {
  id: string;
  user_id: string | null;
  username: string | null;
  media_url: string;
  title?: string | null;
  offer_link?: string | null;
  payout?: string | null;
  question?: string | null;
  created_at: string;
  expires_at?: string | null;
  status?: string | null;
  views?: number;
  clicks?: number;
}

export default function StorySection() {
  const [stories, setStories] = useState<Story[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [email, setEmail] = useState("");
  const [sendingMagic, setSendingMagic] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const [showEmailInput, setShowEmailInput] = useState(false);
  const [showUploadQuestions, setShowUploadQuestions] = useState(false);
  const [offerTitle, setOfferTitle] = useState("");
  const [offerLink, setOfferLink] = useState("");
  const [payout, setPayout] = useState("");
  const [questionText, setQuestionText] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ----------------- AUTH -----------------
  useEffect(() => {
    const getUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setUser(userData.user);
        setLoginSuccess(true);
      }
    };
    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setLoginSuccess(true);
      } else {
        setUser(null);
        setLoginSuccess(false);
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  // ----------------- FETCH STORIES -----------------
  const fetchStories = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .gt("expires_at", now)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) console.error("fetchStories error", error);
      else setStories((data as Story[]) || []);
    } catch (err) {
      console.error("fetchStories unexpected", err);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const isVideoFile = (url: string) =>
    [".mp4", ".webm", ".mov"].some((ext) => url.toLowerCase().endsWith(ext));

  // ----------------- LOGIN MAGIC LINK -----------------
  const sendMagicLink = async () => {
    if (!email) return alert("Please enter your email.");
    setSendingMagic(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setSendingMagic(false);
    if (error) alert("Error: " + error.message);
    else {
      alert("✅ Magic link sent! Check your email.");
      setShowEmailInput(false);
      setEmail("");
    }
  };

  // ----------------- UPLOAD HANDLER -----------------
  const handleUpload = async () => {
    if (!file) return alert("Select a file first!");
    if (!user) return alert("You must be logged in to upload.");
    if (!offerLink) return alert("Please enter the offer / tracking link.");
    if (!offerTitle) return alert("Please add an offer title.");

    setLoading(true);
    try {
      const fileExt = file.name.split(".").pop() ?? "dat";
      const fileName = `story_${user.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("stories").getPublicUrl(fileName);
      const publicUrl = (urlData as any).publicUrl;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error: insertError } = await supabase.from("stories").insert({
        user_id: user.id,
        username: user.email ?? user.id,
        media_url: publicUrl,
        title: offerTitle,
        offer_link: offerLink,
        payout: payout || null,
        question: questionText || null,
        expires_at: expiresAt,
        status: "active",
      });

      if (insertError) throw insertError;

      setFile(null);
      setOfferTitle("");
      setOfferLink("");
      setPayout("");
      setQuestionText("");
      setShowUploadQuestions(false);

      await fetchStories();
      alert("🎉 Story uploaded successfully!");
    } catch (err: any) {
      console.error("Upload failed", err);
      alert("Upload failed: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  // ----------------- AUTO VIEW ADVANCE -----------------
  useEffect(() => {
    let timer: any = null;
    if (openIndex !== null && stories[openIndex]) {
      const storyId = stories[openIndex].id;

      supabase
        .from("stories")
        .update({ views: (stories[openIndex].views || 0) + 1 })
        .eq("id", storyId)
        .then(() => {})
        .catch((err) => console.error("inc view err", err));

      timer = setTimeout(() => {
        setOpenIndex((prev) => {
          if (prev === null) return null;
          if (prev < stories.length - 1) return prev + 1;
          return null;
        });
      }, 8000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [openIndex, stories]);

  // ----------------- UI -----------------
  return (
    <>
      <div className="bg-gradient-to-br from-amber-800 to-orange-700 rounded-lg border border-amber-500 shadow-lg p-3 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <h2 className="text-yellow-300 font-bold text-sm">STORIES</h2>
          </div>

          <div className="flex items-center gap-2">
            {!user ? (
              <>
                {!showEmailInput ? (
                  <Button
                    onClick={() => setShowEmailInput(true)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs h-7 px-3 font-medium"
                  >
                    Login
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="p-1.5 rounded border border-gray-300 text-black text-xs w-36 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                    />
                    <Button
                      onClick={sendMagicLink}
                      disabled={sendingMagic}
                      className="bg-green-500 hover:bg-green-600 text-white text-xs h-7 px-3 font-medium"
                    >
                      {sendingMagic ? "Sending..." : "Send Link"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEmailInput(false)}
                      className="h-5 w-5 p-0 text-yellow-300 hover:bg-yellow-700"
                    >
                      <X size={12} />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-yellow-200 text-xs font-medium">
                  Hi, {user.email?.split("@")[0]}
                </span>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-7 h-7 bg-yellow-400 hover:bg-yellow-500 text-black rounded-full p-0 shadow-md"
                  title="Add Story"
                >
                  <Plus size={14} />
                </Button>
                <input
                  type="file"
                  accept="image/*,video/*"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const selected = e.target.files?.[0] || null;
                    setFile(selected);
                    if (selected) setShowUploadQuestions(true);
                  }}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </div>

        {/* Upload Form */}
        {showUploadQuestions && (
          <div className="p-3 bg-white/95 text-black rounded-lg shadow-md mb-3 border border-yellow-400">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-xs text-gray-800">UPLOAD STORY</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUploadQuestions(false)}
                className="h-5 w-5 p-0 hover:bg-gray-200"
              >
                <X size={12} />
              </Button>
            </div>

            <div className="space-y-2">
              <input
                className="w-full p-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-yellow-400"
                placeholder="Offer title *"
                value={offerTitle}
                onChange={(e) => setOfferTitle(e.target.value)}
              />
              <input
                className="w-full p-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-yellow-400"
                placeholder="Offer / tracking link *"
                value={offerLink}
                onChange={(e) => setOfferLink(e.target.value)}
              />
              <input
                className="w-full p-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-yellow-400"
                placeholder="Payout (optional)"
                value={payout}
                onChange={(e) => setPayout(e.target.value)}
              />
              <textarea
                className="w-full p-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-yellow-400"
                placeholder="Message (optional)"
                rows={2}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
              />
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleUpload}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-3 flex-1 font-medium"
                >
                  {loading ? "Uploading..." : "📤 Upload Story"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STORY LIST */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {stories.length === 0 ? (
            <div className="flex flex-col items-center justify-center w-full py-4">
              <div className="w-12 h-12 rounded-full bg-amber-700 border border-amber-500 flex items-center justify-center mb-2">
                <Plus size={20} className="text-yellow-300" />
              </div>
              <p className="text-xs text-amber-200 text-center">
                No active stories<br />
                <span className="text-amber-300">Be the first to upload!</span>
              </p>
            </div>
          ) : (
            stories.map((story, idx) => (
              <div
                key={story.id}
                className="flex flex-col items-center cursor-pointer min-w-[70px] group"
                onClick={() => setOpenIndex(idx)}
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full border-2 border-yellow-400 overflow-hidden shadow-lg group-hover:border-yellow-300 group-hover:scale-105 transition-all duration-200">
                    {isVideoFile(story.media_url) ? (
                      <video
                        src={story.media_url}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={story.media_url}
                        className="w-full h-full object-cover"
                        alt={story.title || "Story"}
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-amber-800"></div>
                </div>
                <p className="text-[9px] text-yellow-200 mt-2 truncate w-[65px] text-center font-medium">
                  {story.username?.split("@")[0] || "User"}
                </p>
                {story.payout && (
                  <div className="text-[8px] bg-green-600 text-white px-1.5 py-0.5 rounded-full mt-1 font-bold">
                    ${story.payout}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* STORY VIEWER MODAL */}
      {openIndex !== null && stories[openIndex] && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
          onClick={() => setOpenIndex(null)}
        >
          <div className="relative w-full max-w-md rounded-xl overflow-hidden bg-white shadow-2xl">
            <button
              onClick={() => setOpenIndex(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <X size={16} />
            </button>

            {isVideoFile(stories[openIndex].media_url) ? (
              <video
                src={stories[openIndex].media_url}
                className="w-full h-auto max-h-[70vh] object-contain"
                autoPlay
                controls
                playsInline
              />
            ) : (
              <img
                src={stories[openIndex].media_url}
                className="w-full h-auto max-h-[70vh] object-contain"
                alt={stories[openIndex].title || "Story"}
              />
            )}

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="text-white">
                <div className="font-bold text-lg mb-1">{stories[openIndex].title}</div>
                {stories[openIndex].payout && (
                  <div className="text-yellow-300 font-semibold text-sm mb-2">
                    Payout: {stories[openIndex].payout}
                  </div>
                )}
                {stories[openIndex].question && (
                  <div className="text-gray-200 text-sm mb-3">
                    {stories[openIndex].question}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-xs font-bold">
                      {stories[openIndex].username?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <span className="text-sm text-gray-300">
                      {stories[openIndex].username?.split("@")[0] || "User"}
                    </span>
                  </div>

                  {stories[openIndex].offer_link && (
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        const link = stories[openIndex].offer_link!;
                        supabase
                          .from("stories")
                          .update({ clicks: (stories[openIndex].clicks || 0) + 1 })
                          .eq("id", stories[openIndex].id)
                          .then(() => {});
                        window.open(link, "_blank");
                      }}
                    >
                      Visit Offer ↗
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {openIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenIndex(openIndex - 1);
              }}
              className="absolute left-4 text-white text-3xl bg-black/50 hover:bg-black/70 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            >
              ‹
            </button>
          )}
          {openIndex < stories.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenIndex(openIndex + 1);
              }}
              className="absolute right-4 text-white text-3xl bg-black/50 hover:bg-black/70 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  );
}

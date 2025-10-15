import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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
    else alert("✅ Magic link sent! Check your email.");
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
      {/* Main Story Section - For Browse Page */}
      <div className="bg-gradient-to-br from-amber-900 to-orange-800 rounded-lg border border-amber-400 shadow-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-yellow-400 font-semibold text-sm">24H Stories</h2>
          
          {/* Login/Upload Section */}
          <div className="flex items-center gap-2">
            {!user ? (
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="p-1 rounded border text-black text-[10px] w-28"
                />
                <Button
                  onClick={sendMagicLink}
                  disabled={sendingMagic}
                  className="bg-yellow-500 text-black hover:bg-yellow-600 text-[10px] h-6"
                >
                  {sendingMagic ? "Sending..." : "Login"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-yellow-300 text-[10px]">Hi, {user.email?.split('@')[0]}</span>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-6 h-6 bg-yellow-400 hover:bg-yellow-500 text-black rounded-full p-0"
                  title="Add Story"
                >
                  <Plus size={12} />
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
          <div className="p-2 bg-white/90 text-black rounded-lg shadow-md mb-3">
            <h3 className="font-semibold mb-2 text-[10px]">Story Upload — Offer Details</h3>

            <input
              className="w-full mb-1 p-1 border rounded text-[10px]"
              placeholder="Offer title"
              value={offerTitle}
              onChange={(e) => setOfferTitle(e.target.value)}
            />
            <input
              className="w-full mb-1 p-1 border rounded text-[10px]"
              placeholder="Offer / tracking link"
              value={offerLink}
              onChange={(e) => setOfferLink(e.target.value)}
            />
            <input
              className="w-full mb-1 p-1 border rounded text-[10px]"
              placeholder="Payout (optional)"
              value={payout}
              onChange={(e) => setPayout(e.target.value)}
            />
            <textarea
              className="w-full mb-1 p-1 border rounded text-[10px]"
              placeholder="Message (optional)"
              rows={2}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />

            <div className="flex gap-1">
              <Button onClick={handleUpload} className="bg-green-600 text-white text-[10px] h-6">
                {loading ? "Uploading..." : "Upload"}
              </Button>
              <Button variant="ghost" onClick={() => setShowUploadQuestions(false)} className="text-[10px] h-6">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* STORY LIST */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {stories.length === 0 ? (
            <p className="text-[10px] text-gray-300 text-center w-full py-2">
              No stories yet. Be the first to upload!
            </p>
          ) : (
            stories.map((story, idx) => (
              <div
                key={story.id}
                className="flex flex-col items-center cursor-pointer min-w-[60px]"
                onClick={() => setOpenIndex(idx)}
              >
                <div className="w-12 h-12 rounded-full border-2 border-yellow-500 overflow-hidden shadow-md">
                  {isVideoFile(story.media_url) ? (
                    <video src={story.media_url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={story.media_url} className="w-full h-full object-cover" />
                  )}
                </div>
                <p className="text-[8px] text-white mt-1 truncate w-[55px] text-center">
                  {story.username?.split('@')[0]}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* STORY VIEWER */}
      {openIndex !== null && stories[openIndex] && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[999] p-4"
          onClick={() => setOpenIndex(null)}
        >
          <div className="relative w-full max-w-xs sm:max-w-md rounded-lg overflow-hidden">
            {isVideoFile(stories[openIndex].media_url) ? (
              <video src={stories[openIndex].media_url} className="w-full rounded-lg" autoPlay controls />
            ) : (
              <img src={stories[openIndex].media_url} className="w-full rounded-lg" />
            )}

            <div className="absolute left-4 top-4 bg-black/50 px-3 py-1 rounded text-white">
              <div className="font-semibold text-sm">{stories[openIndex].title}</div>
              {stories[openIndex].payout && (
                <div className="text-xs">{stories[openIndex].payout}</div>
              )}
            </div>

            {stories[openIndex].offer_link && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded shadow"
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
                  Visit Offer
                </button>
              </div>
            )}
          </div>

          {/* Arrows */}
          {openIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenIndex(openIndex - 1);
              }}
              className="absolute left-4 text-white text-3xl sm:text-4xl"
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
              className="absolute right-4 text-white text-3xl sm:text-4xl"
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  );
}
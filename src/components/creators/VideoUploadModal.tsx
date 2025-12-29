import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Upload, Plus, Trash2, AlertCircle, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Platform Icons
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z"/>
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

interface Topic {
  id: number;
  name: string;
}

interface ChannelLink {
  url: string;
  platform: 'tiktok' | 'youtube' | 'instagram' | 'facebook' | null;
}

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lang: 'hu' | 'en';
  remainingActivations: number;
}

const texts = {
  title: { hu: 'Videó feltöltése', en: 'Upload video' },
  uploadVideo: { hu: 'Videó kiválasztása', en: 'Select video' },
  dragDrop: { hu: 'Húzd ide vagy kattints a feltöltéshez', en: 'Drag & drop or click to upload' },
  maxSize: { hu: 'Max. 100MB • MP4, MOV, WebM • Min. 15 mp', en: 'Max. 100MB • MP4, MOV, WebM • Min. 15 sec' },
  channelLinks: { hu: 'Csatorna linkek', en: 'Channel links' },
  channelLinksDesc: { hu: 'Add meg, hol található ez a videó (min. 1)', en: 'Add where this video can be found (min. 1)' },
  addLink: { hu: 'Link hozzáadása', en: 'Add link' },
  selectTopics: { hu: 'Válassz témákat (max 5)', en: 'Select topics (max 5)' },
  submit: { hu: 'Videó feltöltése', en: 'Upload video' },
  cancel: { hu: 'Mégse', en: 'Cancel' },
  processing: { hu: 'Feltöltés...', en: 'Uploading...' },
  success: { hu: 'Videó sikeresen feltöltve!', en: 'Video uploaded successfully!' },
  error: { hu: 'Hiba történt. Kérlek próbáld újra!', en: 'An error occurred. Please try again!' },
  tooShort: { hu: 'A videó legalább 15 másodperces kell legyen!', en: 'Video must be at least 15 seconds!' },
  tooLarge: { hu: 'A videó maximum 100MB lehet!', en: 'Video must be under 100MB!' },
  invalidFormat: { hu: 'Csak MP4, MOV vagy WebM formátum!', en: 'Only MP4, MOV or WebM format!' },
  noLinks: { hu: 'Legalább 1 csatorna linket adj meg!', en: 'Add at least 1 channel link!' },
  invalidLink: { hu: 'Érvénytelen link', en: 'Invalid link' },
  topicsRequired: { hu: 'Legalább 1 témát válassz ki!', en: 'Select at least 1 topic!' },
  maxTopicsReached: { hu: 'Maximum 5 témát választhatsz', en: 'You can select up to 5 topics' },
  limitReached: { hu: 'Elérted a napi limitet', en: 'Daily limit reached' },
  placeholder: { hu: 'https://www.tiktok.com/@...', en: 'https://www.tiktok.com/@...' },
  changeVideo: { hu: 'Videó cseréje', en: 'Change video' },
};

const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

const detectPlatform = (url: string): 'tiktok' | 'youtube' | 'instagram' | 'facebook' | null => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('tiktok.com') || lowerUrl.includes('vm.tiktok.com')) return 'tiktok';
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
  if (lowerUrl.includes('instagram.com')) return 'instagram';
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch')) return 'facebook';
  return null;
};

const getPlatformIcon = (platform: ChannelLink['platform']) => {
  switch (platform) {
    case 'tiktok': return <TikTokIcon className="w-5 h-5" />;
    case 'youtube': return <YouTubeIcon className="w-5 h-5 text-red-500" />;
    case 'instagram': return <InstagramIcon className="w-5 h-5 text-pink-500" />;
    case 'facebook': return <FacebookIcon className="w-5 h-5 text-blue-500" />;
    default: return null;
  }
};

const VideoUploadModal = ({
  isOpen,
  onClose,
  onSuccess,
  lang,
  remainingActivations,
}: VideoUploadModalProps) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [channelLinks, setChannelLinks] = useState<ChannelLink[]>([{ url: '', platform: null }]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Fetch topics
  useEffect(() => {
    const fetchTopics = async () => {
      const { data } = await supabase.from('topics').select('id, name').order('name');
      if (data) setTopics(data);
    };
    if (isOpen) fetchTopics();
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setVideoFile(null);
      setVideoPreviewUrl(null);
      setVideoDuration(0);
      setChannelLinks([{ url: '', platform: null }]);
      setSelectedTopicIds([]);
      setUploadProgress(0);
    }
  }, [isOpen]);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(texts.invalidFormat[lang]);
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error(texts.tooLarge[lang]);
      return;
    }
    
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
  }, [lang]);

  // Handle video metadata loaded
  const handleVideoMetadata = useCallback(() => {
    if (videoPreviewRef.current) {
      const duration = videoPreviewRef.current.duration;
      setVideoDuration(duration);
      if (duration < 15) {
        toast.error(texts.tooShort[lang]);
        setVideoFile(null);
        setVideoPreviewUrl(null);
      }
    }
  }, [lang]);

  // Handle drag events
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
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // Handle channel link change
  const handleLinkChange = useCallback((index: number, value: string) => {
    setChannelLinks(prev => {
      const updated = [...prev];
      updated[index] = { url: value, platform: detectPlatform(value) };
      return updated;
    });
  }, []);

  // Add new link field
  const addLinkField = useCallback(() => {
    if (channelLinks.length < 4) {
      setChannelLinks(prev => [...prev, { url: '', platform: null }]);
    }
  }, [channelLinks.length]);

  // Remove link field
  const removeLinkField = useCallback((index: number) => {
    if (channelLinks.length > 1) {
      setChannelLinks(prev => prev.filter((_, i) => i !== index));
    }
  }, [channelLinks.length]);

  // Handle topic toggle
  const handleTopicToggle = useCallback((topicId: number) => {
    setSelectedTopicIds(prev => {
      if (prev.includes(topicId)) {
        return prev.filter(id => id !== topicId);
      } else {
        if (prev.length >= 5) {
          toast.error(texts.maxTopicsReached[lang]);
          return prev;
        }
        return [...prev, topicId];
      }
    });
  }, [lang]);

  // Submit
  const handleSubmit = async () => {
    if (!videoFile) return;
    
    // Validate links
    const validLinks = channelLinks.filter(l => l.url.trim() && l.platform);
    if (validLinks.length === 0) {
      toast.error(texts.noLinks[lang]);
      return;
    }
    
    if (selectedTopicIds.length === 0) {
      toast.error(texts.topicsRequired[lang]);
      return;
    }
    
    if (remainingActivations <= 0) {
      toast.error(texts.limitReached[lang]);
      return;
    }

    setIsLoading(true);
    setUploadProgress(10);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      // Generate unique file path
      const fileExt = videoFile.name.split('.').pop() || 'mp4';
      const videoGroupId = crypto.randomUUID();
      const filePath = `${session.user.id}/${videoGroupId}.${fileExt}`;

      setUploadProgress(20);

      // Upload video to storage
      const { error: uploadError } = await supabase.storage
        .from('creator-videos')
        .upload(filePath, videoFile, {
          contentType: videoFile.type,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      setUploadProgress(60);

      // Prepare channel_links array for the edge function
      const channelLinksPayload = validLinks.map(link => ({
        url: link.url,
        platform: link.platform,
      }));

      // Call edge function to create video records
      const { data, error: insertError } = await supabase.functions.invoke('submit-creator-video', {
        body: {
          video_file_path: filePath,
          channel_links: channelLinksPayload,
          duration_seconds: Math.floor(videoDuration),
          file_size_bytes: videoFile.size,
          topic_ids: selectedTopicIds,
        },
      });

      if (insertError) throw insertError;
      if (!data?.success) throw new Error(data?.error || 'Unknown error');

      setUploadProgress(100);
      toast.success(texts.success[lang]);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(texts.error[lang]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const canAddMore = remainingActivations > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-[95vw] max-w-lg max-h-[90vh] bg-gradient-to-b from-[#0a0a2e] via-[#16213e] to-[#0f0f3d] rounded-2xl overflow-hidden border border-white/10 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">{texts.title[lang]}</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Limit warning */}
          {!canAddMore && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{texts.limitReached[lang]}</p>
            </div>
          )}

          {/* Video Upload Area */}
          <div>
            {!videoFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                  ${isDragging 
                    ? 'border-purple-400 bg-purple-500/10' 
                    : 'border-white/20 hover:border-white/40 bg-white/5'
                  }
                `}
              >
                <Upload className="w-12 h-12 mx-auto mb-3 text-white/50" />
                <p className="text-white font-medium mb-1">{texts.dragDrop[lang]}</p>
                <p className="text-white/50 text-sm">{texts.maxSize[lang]}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[300px] mx-auto">
                <video
                  ref={videoPreviewRef}
                  src={videoPreviewUrl || ''}
                  onLoadedMetadata={handleVideoMetadata}
                  className="w-full h-full object-contain"
                  controls
                  muted
                />
                <button
                  onClick={() => {
                    setVideoFile(null);
                    setVideoPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 p-2 rounded-full bg-black/70 hover:bg-black/90"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                {videoDuration > 0 && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/70 text-white text-xs">
                    {Math.floor(videoDuration)}s
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Channel Links */}
          <div>
            <label className="block text-white font-medium mb-1">{texts.channelLinks[lang]}</label>
            <p className="text-white/50 text-xs mb-3">{texts.channelLinksDesc[lang]}</p>
            
            <div className="space-y-2">
              {channelLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => handleLinkChange(index, e.target.value)}
                      placeholder={texts.placeholder[lang]}
                      className="w-full px-4 py-2.5 pl-10 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      {link.platform ? (
                        getPlatformIcon(link.platform)
                      ) : (
                        <div className="w-5 h-5 rounded bg-white/10" />
                      )}
                    </div>
                    {link.url && link.platform && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                    )}
                  </div>
                  {channelLinks.length > 1 && (
                    <button
                      onClick={() => removeLinkField(index)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {channelLinks.length < 4 && (
              <button
                onClick={addLinkField}
                className="mt-2 flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm"
              >
                <Plus className="w-4 h-4" />
                {texts.addLink[lang]}
              </button>
            )}
          </div>

          {/* Topics */}
          <div>
            <label className="block text-white font-medium mb-2">
              {texts.selectTopics[lang]} ({selectedTopicIds.length}/5)
            </label>
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => handleTopicToggle(topic.id)}
                  className={`
                    px-3 py-1.5 rounded-full text-sm transition-all
                    ${selectedTopicIds.includes(topic.id)
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }
                  `}
                >
                  {topic.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 disabled:opacity-50"
          >
            {texts.cancel[lang]}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!videoFile || !canAddMore || isLoading}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {uploadProgress}%
              </>
            ) : (
              texts.submit[lang]
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoUploadModal;

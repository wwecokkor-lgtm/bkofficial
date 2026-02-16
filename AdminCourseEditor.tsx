import React, { useState, useEffect } from 'react';
import { Course, Section, Lesson, Instructor } from './types';
import { uploadFileToLocalServer, generateCourseDescription, suggestCourseOutline, getYoutubeId } from './api';

interface AdminCourseEditorProps {
  initialData?: Course;
  onSave: (course: Omit<Course, 'id'>) => Promise<void>;
  onCancel: () => void;
}

const AdminCourseEditor: React.FC<AdminCourseEditorProps> = ({ initialData, onSave, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'curriculum' | 'media' | 'pricing' | 'settings'>('basic');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // --- FORM STATE ---
  const [title, setTitle] = useState(initialData?.title || '');
  const [subtitle, setSubtitle] = useState(initialData?.subtitle || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [longDescription, setLongDescription] = useState(initialData?.longDescription || '');
  const [category, setCategory] = useState(initialData?.category || 'Programming');
  const [level, setLevel] = useState<Course['level']>(initialData?.level || 'Beginner');
  const [language, setLanguage] = useState(initialData?.language || 'Bangla');
  const [tags, setTags] = useState(initialData?.tags?.join(', ') || '');
  
  const [price, setPrice] = useState(initialData?.price || 0);
  const [discountPrice, setDiscountPrice] = useState(initialData?.discountPrice || 0);
  const [pointsPrice, setPointsPrice] = useState(initialData?.pointsPrice || 0);
  
  const [thumbnailUrl, setThumbnailUrl] = useState(initialData?.thumbnailUrl || '');
  const [videoUrl, setVideoUrl] = useState(initialData?.videoUrl || '');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const [sections, setSections] = useState<Section[]>(initialData?.sections || []);
  
  const [instructorName, setInstructorName] = useState(initialData?.instructor?.name || 'Admin Instructor');
  const [instructorBio, setInstructorBio] = useState(initialData?.instructor?.bio || '');
  const [isPublished, setIsPublished] = useState(initialData?.isPublished ?? false);

  // --- HANDLERS ---
  const handleAiDescription = async () => {
    if (!title) return alert("দয়া করে কোর্সের শিরোনাম লিখুন");
    setAiLoading(true);
    const desc = await generateCourseDescription(title, category);
    if (desc) setDescription(desc);
    setAiLoading(false);
  };

  const handleAiOutline = async () => {
    if (!title) return alert("দয়া করে কোর্সের শিরোনাম লিখুন");
    setAiLoading(true);
    const outline = await suggestCourseOutline(title, level || 'Beginner');
    if (outline.length > 0) setSections([...sections, ...outline]);
    setAiLoading(false);
  };

  const handleAddSection = () => {
    setSections([...sections, { id: `sec-${Date.now()}`, title: 'নতুন সেকশন', lessons: [] }]);
  };

  const handleUpdateSection = (idx: number, key: keyof Section, value: any) => {
    const updated = [...sections];
    updated[idx] = { ...updated[idx], [key]: value };
    setSections(updated);
  };

  const handleDeleteSection = (idx: number) => {
    const updated = [...sections];
    updated.splice(idx, 1);
    setSections(updated);
  };

  const handleAddLesson = (sectionIdx: number) => {
    const updated = [...sections];
    updated[sectionIdx].lessons.push({
      id: `les-${Date.now()}`,
      title: 'নতুন পাঠ',
      type: 'video',
      isFreePreview: false
    });
    setSections(updated);
  };

  const handleUpdateLesson = (sectionIdx: number, lessonIdx: number, key: keyof Lesson, value: any) => {
    const updated = [...sections];
    
    if (key === 'contentUrl') {
       // Auto-extract YouTube ID when URL is pasted
       const ytId = getYoutubeId(value);
       if (ytId) {
          updated[sectionIdx].lessons[lessonIdx].youtubeId = ytId;
          // Auto-set thumbnail from YouTube if not present? Maybe user wants custom.
       }
    }

    updated[sectionIdx].lessons[lessonIdx] = { ...updated[sectionIdx].lessons[lessonIdx], [key]: value };
    setSections(updated);
  };

  const handleDeleteLesson = (sectionIdx: number, lessonIdx: number) => {
    const updated = [...sections];
    updated[sectionIdx].lessons.splice(lessonIdx, 1);
    setSections(updated);
  };

  const moveLesson = (sIdx: number, lIdx: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && lIdx === 0) || (direction === 'down' && lIdx === sections[sIdx].lessons.length - 1)) return;
    const newLessons = [...sections[sIdx].lessons];
    const targetIdx = direction === 'up' ? lIdx - 1 : lIdx + 1;
    [newLessons[lIdx], newLessons[targetIdx]] = [newLessons[targetIdx], newLessons[lIdx]];
    
    const updatedSections = [...sections];
    updatedSections[sIdx].lessons = newLessons;
    setSections(updatedSections);
  };

  const handleSave = async () => {
    setLoading(true);
    let finalThumbnail = thumbnailUrl;

    if (thumbnailFile) {
      finalThumbnail = await uploadFileToLocalServer(thumbnailFile);
    }

    if (!finalThumbnail) {
      alert("থাম্বনেইল ইমেজ প্রয়োজন");
      setLoading(false);
      return;
    }

    const courseData: Omit<Course, 'id'> = {
      title,
      subtitle,
      description,
      longDescription,
      category,
      level,
      language,
      tags: (tags || '').split(',').map(t => t.trim()),
      price: Number(price),
      discountPrice: Number(discountPrice),
      pointsPrice: Number(pointsPrice),
      thumbnailUrl: finalThumbnail,
      videoUrl,
      isPublished,
      sections,
      instructor: {
        name: instructorName,
        bio: instructorBio
      },
      studentsCount: initialData?.studentsCount || 0
    };

    await onSave(courseData);
    setLoading(false);
  };

  const TabButton = ({ id, label, icon }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium transition-colors duration-200 ${
        activeTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      <i className={`fas ${icon}`}></i>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="bg-white rounded-lg shadow-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">
          {initialData ? 'কোর্স এডিট করুন' : 'নতুন কোর্স তৈরি করুন'}
        </h2>
        <div className="flex space-x-3">
          <button onClick={onCancel} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100">
            বাতিল
          </button>
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 flex items-center"
          >
            {loading && <i className="fas fa-spinner fa-spin mr-2"></i>}
            সংরক্ষণ করুন
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-6 border-b overflow-x-auto">
        <TabButton id="basic" label="বেসিক তথ্য" icon="fa-info-circle" />
        <TabButton id="curriculum" label="পাঠ্যক্রম" icon="fa-list-ol" />
        <TabButton id="media" label="মিডিয়া" icon="fa-photo-video" />
        <TabButton id="pricing" label="মূল্য নির্ধারণ" icon="fa-tags" />
        <TabButton id="settings" label="সেটিংস" icon="fa-cog" />
      </div>

      {/* Content Area */}
      <div className="p-6 overflow-y-auto flex-grow">
        {activeTab === 'basic' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">কোর্সের শিরোনাম *</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" 
                  placeholder="যেমন: সম্পূর্ণ ওয়েব ডেভেলপমেন্ট গাইড"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">সাব-টাইটেল</label>
                <input 
                  type="text" 
                  value={subtitle} 
                  onChange={e => setSubtitle(e.target.value)} 
                  className="w-full border p-2 rounded" 
                  placeholder="এক নজরে কোর্সের মূল বিষয়"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">ক্যাটাগরি</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border p-2 rounded">
                  <option>Programming</option>
                  <option>Design</option>
                  <option>Marketing</option>
                  <option>Business</option>
                  <option>Academic</option>
                  <option>Language</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">লেভেল</label>
                <select value={level} onChange={e => setLevel(e.target.value as any)} className="w-full border p-2 rounded">
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">ভাষা</label>
                <input type="text" value={language} onChange={e => setLanguage(e.target.value)} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">ট্যাগ (কমা দিয়ে আলাদা করুন)</label>
                <input type="text" value={tags} onChange={e => setTags(e.target.value)} className="w-full border p-2 rounded" placeholder="react, js, web" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-bold text-gray-700">সংক্ষিপ্ত বিবরণ (Short Description)</label>
                <button 
                  onClick={handleAiDescription} 
                  disabled={aiLoading}
                  className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 flex items-center"
                >
                  <i className="fas fa-magic mr-1"></i> {aiLoading ? 'তৈরি হচ্ছে...' : 'AI দিয়ে লিখুন'}
                </button>
              </div>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                className="w-full border p-2 rounded h-24"
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">বিস্তারিত বিবরণ (HTML/Markdown)</label>
              <textarea 
                value={longDescription} 
                onChange={e => setLongDescription(e.target.value)} 
                className="w-full border p-2 rounded h-48 font-mono text-sm"
                placeholder="<h1>কোর্স সম্পর্কে বিস্তারিত...</h1>"
              ></textarea>
              <p className="text-xs text-gray-500 mt-1">আপনি এখানে সাধারণ HTML ট্যাগ ব্যবহার করতে পারেন।</p>
            </div>
          </div>
        )}

        {activeTab === 'curriculum' && (
          <div className="max-w-4xl mx-auto space-y-6">
             <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
               <div>
                 <h3 className="font-bold text-blue-800">কোর্স কারিকুলাম বিল্ডার</h3>
                 <p className="text-sm text-blue-600">YouTube URL পেস্ট করলে অটোমেটিক ভিডিও ডিটেক্ট হবে।</p>
               </div>
               <div className="flex space-x-2">
                 <button onClick={handleAiOutline} disabled={aiLoading} className="bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700">
                   <i className="fas fa-magic mr-1"></i> {aiLoading ? '...' : 'AI সাজেস্ট'}
                 </button>
                 <button onClick={handleAddSection} className="bg-gray-800 text-white px-3 py-2 rounded text-sm hover:bg-gray-900">
                   <i className="fas fa-plus mr-1"></i> সেকশন যোগ করুন
                 </button>
               </div>
             </div>

             <div className="space-y-4">
               {sections.map((section, sIdx) => (
                 <div key={section.id} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                   <div className="bg-gray-100 p-3 flex justify-between items-center border-b">
                     <div className="flex items-center space-x-3 flex-grow">
                       <i className="fas fa-grip-lines text-gray-400 cursor-move"></i>
                       <span className="font-bold text-gray-500">সেকশন {sIdx + 1}:</span>
                       <input 
                         type="text" 
                         value={section.title} 
                         onChange={(e) => handleUpdateSection(sIdx, 'title', e.target.value)}
                         className="bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none px-2 py-1 font-bold text-gray-800 w-full max-w-md"
                       />
                     </div>
                     <div className="flex space-x-2">
                       <button onClick={() => handleDeleteSection(sIdx)} className="text-red-500 hover:text-red-700 p-1">
                         <i className="fas fa-trash"></i>
                       </button>
                       <button onClick={() => handleAddLesson(sIdx)} className="text-blue-600 hover:text-blue-800 font-medium text-sm border border-blue-600 px-2 py-1 rounded hover:bg-blue-50">
                         + পাঠ যোগ করুন
                       </button>
                     </div>
                   </div>
                   
                   <div className="p-4 space-y-3 bg-gray-50/50">
                     {section.lessons.length === 0 && <p className="text-center text-gray-400 text-sm italic">কোনো পাঠ নেই। নতুন যোগ করুন।</p>}
                     {section.lessons.map((lesson, lIdx) => (
                       <div key={lesson.id} className="flex flex-col md:flex-row items-start md:items-center space-y-3 md:space-y-0 md:space-x-4 bg-white p-3 rounded border hover:border-blue-300 transition shadow-sm">
                         <div className="flex flex-col space-y-1 text-gray-400">
                            <button onClick={() => moveLesson(sIdx, lIdx, 'up')} className="hover:text-blue-600"><i className="fas fa-caret-up"></i></button>
                            <button onClick={() => moveLesson(sIdx, lIdx, 'down')} className="hover:text-blue-600"><i className="fas fa-caret-down"></i></button>
                         </div>
                         
                         <div className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                           <div className="md:col-span-1">
                              <input 
                                type="text" 
                                value={lesson.title} 
                                onChange={(e) => handleUpdateLesson(sIdx, lIdx, 'title', e.target.value)}
                                className="w-full border rounded px-2 py-1 text-sm font-medium"
                                placeholder="পাঠের নাম"
                              />
                           </div>
                           <div className="md:col-span-2">
                              <div className="flex items-center space-x-2">
                                 <select 
                                   value={lesson.type} 
                                   onChange={(e) => handleUpdateLesson(sIdx, lIdx, 'type', e.target.value)}
                                   className="border rounded px-2 py-1 text-sm bg-gray-50"
                                 >
                                   <option value="video">ভিডিও (YouTube)</option>
                                   <option value="pdf">পিডিএফ</option>
                                   <option value="quiz">কুইজ</option>
                                 </select>
                                 <input 
                                   type="text"
                                   value={lesson.contentUrl || ''}
                                   onChange={(e) => handleUpdateLesson(sIdx, lIdx, 'contentUrl', e.target.value)}
                                   className="flex-grow border rounded px-2 py-1 text-sm"
                                   placeholder={lesson.type === 'video' ? 'YouTube URL' : 'File URL'}
                                 />
                              </div>
                              {lesson.youtubeId && <p className="text-[10px] text-green-600 mt-1"><i className="fab fa-youtube"></i> Detected ID: {lesson.youtubeId}</p>}
                           </div>
                           <div className="flex items-center space-x-2">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={lesson.isFreePreview} 
                                  onChange={(e) => handleUpdateLesson(sIdx, lIdx, 'isFreePreview', e.target.checked)}
                                  className="form-checkbox text-blue-600 h-4 w-4"
                                />
                                <span className="text-xs text-gray-600">ফ্রি</span>
                              </label>
                              <div className="flex-grow text-right">
                                <button onClick={() => handleDeleteLesson(sIdx, lIdx)} className="text-gray-400 hover:text-red-500 p-1">
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* ... (Media, Pricing, Settings tabs remain largely same, just standard inputs) ... */}
        {activeTab === 'media' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="bg-white p-6 border rounded-lg shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4">কোর্স থাম্বনেইল</h3>
              <div className="flex items-start space-x-6">
                <div className="w-48 h-32 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center border-2 border-dashed border-gray-400">
                  {thumbnailUrl || thumbnailFile ? (
                    <img 
                      src={thumbnailFile ? URL.createObjectURL(thumbnailFile) : thumbnailUrl} 
                      className="w-full h-full object-cover" 
                      alt="Thumbnail" 
                    />
                  ) : (
                    <span className="text-gray-500 text-sm">নো ইমেজ</span>
                  )}
                </div>
                <div className="flex-grow">
                  <p className="text-sm text-gray-600 mb-2">আপনার কোর্সের জন্য একটি আকর্ষণীয় ছবি আপলোড করুন। (750x422 pixels)</p>
                  <input type="file" onChange={e => setThumbnailFile(e.target.files ? e.target.files[0] : null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 border rounded-lg shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4">প্রোমো ভিডিও</h3>
              <label className="block text-sm font-bold text-gray-700 mb-1">YouTube Video URL</label>
              <input 
                type="text" 
                value={videoUrl} 
                onChange={e => setVideoUrl(e.target.value)} 
                className="w-full border p-2 rounded mb-2" 
                placeholder="https://youtube.com/watch?v=..." 
              />
              <p className="text-xs text-gray-500">শিক্ষার্থীরা এই ভিডিওটি ফ্রিতে দেখতে পাবে।</p>
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
              <p className="text-sm text-yellow-800"><i className="fas fa-lightbulb mr-2"></i> ফ্রি কোর্স তৈরি করতে মূল্য ০ রাখুন।</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">রেগুলার মূল্য (৳)</label>
                <input 
                  type="number" 
                  value={price} 
                  onChange={e => setPrice(Number(e.target.value))} 
                  className="w-full border p-2 rounded text-lg font-bold text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">ডিসকাউন্ট মূল্য (৳)</label>
                <input 
                  type="number" 
                  value={discountPrice} 
                  onChange={e => setDiscountPrice(Number(e.target.value))} 
                  className="w-full border p-2 rounded text-lg font-bold text-green-600"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-bold text-gray-800 mb-4">রিওয়ার্ড পয়েন্ট</h4>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">পয়েন্ট দিয়ে কিনুন</label>
                <input 
                  type="number" 
                  value={pointsPrice} 
                  onChange={e => setPointsPrice(Number(e.target.value))} 
                  className="w-full border p-2 rounded"
                  placeholder="যেমন: 5000 পয়েন্ট"
                />
                <p className="text-xs text-gray-500 mt-1">শিক্ষার্থীরা কত পয়েন্ট খরচ করে এই কোর্সটি বিনামূল্যে পেতে পারে।</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="bg-white p-6 border rounded-lg shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4">কোর্স স্ট্যাটাস</h3>
              <div className="flex items-center space-x-4">
                 <label className="flex items-center space-x-2 cursor-pointer">
                   <input type="radio" name="status" checked={isPublished} onChange={() => setIsPublished(true)} className="form-radio text-green-600" />
                   <span className="text-gray-800 font-medium">প্রকাশিত (Published)</span>
                 </label>
                 <label className="flex items-center space-x-2 cursor-pointer">
                   <input type="radio" name="status" checked={!isPublished} onChange={() => setIsPublished(false)} className="form-radio text-gray-600" />
                   <span className="text-gray-800 font-medium">ড্রাফট (Draft)</span>
                 </label>
              </div>
            </div>

            <div className="bg-white p-6 border rounded-lg shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4">ইনস্ট্রাক্টর তথ্য</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">নাম</label>
                  <input type="text" value={instructorName} onChange={e => setInstructorName(e.target.value)} className="w-full border p-2 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">বায়ো</label>
                  <textarea value={instructorBio} onChange={e => setInstructorBio(e.target.value)} className="w-full border p-2 rounded h-20"></textarea>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCourseEditor;
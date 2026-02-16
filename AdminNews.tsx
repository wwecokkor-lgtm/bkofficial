import React, { useState, useEffect } from 'react';
import { NewsPost, NewsCategory } from './types';
import { getNews, addNews, updateNews, deleteNews, togglePinNews, uploadFileToLocalServer } from './api';
import { useAuth } from './AuthContext';

const AdminNews = () => {
  const { userProfile } = useAuth();
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(false);

  // Editor State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NewsCategory>('General');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [featuredImage, setFeaturedImage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    refreshNews();
  }, []);

  const refreshNews = async () => {
    setLoading(true);
    const data = await getNews('All');
    setPosts(data);
    setLoading(false);
  };

  const handleEdit = (post: NewsPost) => {
    setEditingId(post.id);
    setTitle(post.title);
    setContent(post.content);
    setCategory(post.category);
    setTags(post.tags.join(', '));
    setStatus(post.status);
    setFeaturedImage(post.featuredImage || '');
    setView('editor');
  };

  const handleCreate = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setCategory('General');
    setTags('');
    setStatus('published');
    setFeaturedImage('');
    setView('editor');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setLoading(true);

    let finalImage = featuredImage;
    if (imageFile) {
        finalImage = await uploadFileToLocalServer(imageFile);
    }

    const postData: Partial<NewsPost> = {
      title,
      content,
      category,
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
      status,
      featuredImage: finalImage,
      authorId: userProfile.uid,
      authorName: userProfile.displayName,
      updatedAt: Date.now()
    };

    if (editingId) {
      await updateNews(editingId, postData);
    } else {
      await addNews({
        ...postData,
        timestamp: Date.now(),
        views: 0,
        likes: 0,
        isPinned: false
      });
    }

    setLoading(false);
    setView('list');
    refreshNews();
  };

  const handleDelete = async (id: string) => {
    if(confirm("Are you sure?")) {
        await deleteNews(id);
        refreshNews();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      {view === 'list' && (
        <div className="space-y-6">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">News & Blog Manager</h2>
              <button onClick={handleCreate} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 shadow flex items-center">
                 <i className="fas fa-plus mr-2"></i> New Post
              </button>
           </div>

           <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
              <table className="min-w-full divide-y divide-gray-200">
                 <thead className="bg-gray-50">
                    <tr>
                       <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Post Info</th>
                       <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Category</th>
                       <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                       <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Stats</th>
                       <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                    {posts.map(post => (
                       <tr key={post.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                             <div className="flex items-center">
                                {post.featuredImage && <img src={post.featuredImage} className="h-10 w-10 rounded object-cover mr-3" />}
                                <div>
                                   <div className="text-sm font-bold text-gray-900">{post.title}</div>
                                   <div className="text-xs text-gray-500">{new Date(post.timestamp).toLocaleDateString()}</div>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <span className="bg-blue-50 text-blue-700 py-1 px-2 rounded text-xs font-bold">{post.category}</span>
                          </td>
                          <td className="px-6 py-4">
                             <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${post.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {post.status}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                             <span className="mr-3"><i className="far fa-eye"></i> {post.views || 0}</span>
                             <span><i className="far fa-heart"></i> {post.likes || 0}</span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                             <button onClick={() => togglePinNews(post.id, !post.isPinned)} className={`text-xs p-1 ${post.isPinned ? 'text-yellow-500' : 'text-gray-400'}`} title="Pin">
                                <i className="fas fa-thumbtack"></i>
                             </button>
                             <button onClick={() => handleEdit(post)} className="text-blue-600 hover:text-blue-900"><i className="fas fa-edit"></i></button>
                             <button onClick={() => handleDelete(post.id)} className="text-red-600 hover:text-red-900"><i className="fas fa-trash"></i></button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {view === 'editor' && (
         <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
               <h3 className="text-lg font-bold text-gray-800">{editingId ? 'Edit Post' : 'Create New Post'}</h3>
               <button onClick={() => setView('list')} className="text-gray-600 hover:text-red-600"><i className="fas fa-times"></i></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                        <input className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={title} onChange={e => setTitle(e.target.value)} required />
                     </div>
                     
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Content (Markdown/HTML)</label>
                        <textarea className="w-full border p-2 rounded h-64 font-mono text-sm" value={content} onChange={e => setContent(e.target.value)} required placeholder="# Heading..."></textarea>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Publish Status</label>
                        <select className="w-full border p-2 rounded" value={status} onChange={e => setStatus(e.target.value as any)}>
                           <option value="published">Published</option>
                           <option value="draft">Draft</option>
                        </select>
                     </div>

                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                        <select className="w-full border p-2 rounded" value={category} onChange={e => setCategory(e.target.value as any)}>
                           {['General', 'Exam', 'Result', 'Scholarship', 'Admission', 'Blog', 'Announcement'].map(c => (
                              <option key={c} value={c}>{c}</option>
                           ))}
                        </select>
                     </div>

                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Tags (Comma separated)</label>
                        <input className="w-full border p-2 rounded" value={tags} onChange={e => setTags(e.target.value)} placeholder="news, update, 2024" />
                     </div>

                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Featured Image</label>
                        <div className="border-2 border-dashed rounded p-4 text-center">
                           {featuredImage && <img src={featuredImage} className="w-full h-32 object-cover mb-2 rounded" />}
                           <input type="file" onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)} className="text-xs" />
                        </div>
                     </div>
                  </div>
               </div>

               <div className="border-t pt-4 flex justify-end">
                  <button type="submit" disabled={loading} className="bg-blue-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-blue-700">
                     {loading ? 'Saving...' : 'Save Post'}
                  </button>
               </div>
            </form>
         </div>
      )}
    </div>
  );
};

export default AdminNews;
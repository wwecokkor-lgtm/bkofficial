import React, { useEffect, useState } from 'react';
import { getNews, incrementNewsView } from './api';
import { NewsPost, NewsCategory } from './types';
import { Link } from 'react-router-dom';

const NewsFeed = () => {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<NewsPost[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const data = await getNews('All');
      setPosts(data.filter(p => p.status === 'published'));
      setFilteredPosts(data.filter(p => p.status === 'published'));
      setLoading(false);
    };
    fetch();
  }, []);

  useEffect(() => {
    let result = posts;
    if (activeCategory !== 'All') {
      result = result.filter(p => p.category === activeCategory);
    }
    if (search) {
      result = result.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.tags.some(t => t.includes(search)));
    }
    setFilteredPosts(result);
  }, [activeCategory, search, posts]);

  const handleRead = (id: string) => {
    incrementNewsView(id);
  };

  const categories = ['All', 'General', 'Exam', 'Result', 'Scholarship', 'Admission', 'Blog', 'Announcement'];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Header */}
        <div className="text-center mb-10">
           <h1 className="text-4xl font-bold text-gray-900 mb-4">BK Academy Newsroom</h1>
           <p className="text-gray-500">Stay updated with the latest notices, exam results, and educational blogs.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
           <div className="flex flex-wrap gap-2 justify-center">
              {categories.map(cat => (
                 <button 
                   key={cat}
                   onClick={() => setActiveCategory(cat)}
                   className={`px-4 py-2 rounded-full text-sm font-bold transition ${activeCategory === cat ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                 >
                   {cat}
                 </button>
              ))}
           </div>
           <div className="relative w-full md:w-64">
              <input 
                type="text" 
                placeholder="Search news..." 
                className="w-full pl-10 pr-4 py-2 rounded-full border focus:ring-2 focus:ring-blue-500 outline-none"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
           </div>
        </div>

        {/* Pinned Posts Banner */}
        {activeCategory === 'All' && posts.filter(p => p.isPinned).length > 0 && (
           <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-6">
              {posts.filter(p => p.isPinned).slice(0, 2).map(post => (
                 <div key={post.id} className="relative bg-gradient-to-r from-blue-800 to-indigo-900 rounded-2xl p-8 text-white overflow-hidden shadow-xl transform hover:-translate-y-1 transition duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><i className="fas fa-bullhorn text-9xl"></i></div>
                    <div className="relative z-10">
                       <span className="bg-yellow-400 text-blue-900 text-xs font-bold px-2 py-1 rounded uppercase mb-2 inline-block">Important</span>
                       <h3 className="text-2xl font-bold mb-2">{post.title}</h3>
                       <p className="text-blue-100 line-clamp-2 mb-4 text-sm opacity-80">{post.content.substring(0, 100)}...</p>
                       <button onClick={() => handleRead(post.id)} className="text-yellow-400 font-bold hover:underline">Read Full Story <i className="fas fa-arrow-right ml-1"></i></button>
                    </div>
                 </div>
              ))}
           </div>
        )}

        {/* Grid */}
        {loading ? (
           <div className="text-center py-20"><div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div></div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.filter(p => !p.isPinned || activeCategory !== 'All').map(post => (
                 <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col h-full">
                    <div className="h-48 bg-gray-200 relative overflow-hidden">
                       {post.featuredImage ? (
                          <img src={post.featuredImage} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                       ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                             <i className="fas fa-image text-4xl"></i>
                          </div>
                       )}
                       <div className="absolute top-4 left-4 bg-white/90 backdrop-blur text-gray-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                          {post.category}
                       </div>
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                       <div className="text-xs text-gray-500 mb-2 flex justify-between items-center">
                          <span><i className="far fa-calendar-alt mr-1"></i> {new Date(post.timestamp).toLocaleDateString()}</span>
                          <span><i className="far fa-eye mr-1"></i> {post.views}</span>
                       </div>
                       <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition">{post.title}</h3>
                       <p className="text-gray-500 text-sm line-clamp-3 mb-4 flex-grow">{post.content.replace(/<[^>]*>?/gm, '')}</p>
                       <div className="mt-auto pt-4 border-t flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-600">By {post.authorName}</span>
                          <button onClick={() => handleRead(post.id)} className="text-blue-600 text-sm font-bold hover:underline">Read More</button>
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
};

export default NewsFeed;
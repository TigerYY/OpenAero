'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface SearchFilters {
  query: string;
  category: string;
  priceRange: [number, number];
  rating: number;
  sortBy: string;
  tags: string[];
  author: string;
  dateRange: string;
  difficulty: string;
  language: string;
}

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'query' | 'category' | 'tag' | 'author';
  count?: number;
}

interface SearchHistory {
  id: string;
  query: string;
  filters: Partial<SearchFilters>;
  timestamp: Date;
  resultCount: number;
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function AdvancedSearch({ onSearch, isOpen, onClose }: AdvancedSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: '',
    priceRange: [0, 1000],
    rating: 0,
    sortBy: 'relevance',
    tags: [],
    author: '',
    dateRange: '',
    difficulty: '',
    language: ''
  });

  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 初始化搜索参数
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    setFilters(prev => ({
      ...prev,
      query: params.get('q') || '',
      category: params.get('category') || '',
      sortBy: params.get('sort') || 'relevance'
    }));
  }, [searchParams]);

  // 加载搜索历史
  useEffect(() => {
    const history = localStorage.getItem('search-history');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  // 获取搜索建议
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('获取搜索建议失败:', error);
    }
  }, []);

  // 处理查询输入变化
  const handleQueryChange = (value: string) => {
    setFilters(prev => ({ ...prev, query: value }));
    fetchSuggestions(value);
    setShowSuggestions(true);
  };

  // 处理筛选器变化
  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // 添加标签
  const addTag = (tag: string) => {
    if (!filters.tags.includes(tag)) {
      setFilters(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  // 移除标签
  const removeTag = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  // 执行搜索
  const handleSearch = async () => {
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      // 保存搜索历史
      const historyItem: SearchHistory = {
        id: Date.now().toString(),
        query: filters.query,
        filters: { ...filters },
        timestamp: new Date(),
        resultCount: 0 // 这里应该从搜索结果中获取
      };

      const updatedHistory = [historyItem, ...searchHistory.slice(0, 9)];
      setSearchHistory(updatedHistory);
      localStorage.setItem('search-history', JSON.stringify(updatedHistory));

      // 更新 URL 参数
      const params = new URLSearchParams();
      if (filters.query) params.set('q', filters.query);
      if (filters.category) params.set('category', filters.category);
      if (filters.sortBy !== 'relevance') params.set('sort', filters.sortBy);
      if (filters.priceRange[0] > 0) params.set('minPrice', filters.priceRange[0].toString());
      if (filters.priceRange[1] < 1000) params.set('maxPrice', filters.priceRange[1].toString());
      if (filters.rating > 0) params.set('rating', filters.rating.toString());
      if (filters.tags.length > 0) params.set('tags', filters.tags.join(','));
      if (filters.author) params.set('author', filters.author);
      if (filters.dateRange) params.set('dateRange', filters.dateRange);
      if (filters.difficulty) params.set('difficulty', filters.difficulty);
      if (filters.language) params.set('language', filters.language);

      router.push(`/solutions?${params.toString()}`);
      onSearch(filters);
      onClose();
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 重置筛选器
  const resetFilters = () => {
    setFilters({
      query: '',
      category: '',
      priceRange: [0, 1000],
      rating: 0,
      sortBy: 'relevance',
      tags: [],
      author: '',
      dateRange: '',
      difficulty: '',
      language: ''
    });
  };

  // 使用搜索历史
  const useSearchHistory = (historyItem: SearchHistory) => {
    setFilters({ ...historyItem.filters } as SearchFilters);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">高级搜索</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 搜索框 */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              搜索关键词
            </label>
            <div className="relative">
              <input
                type="text"
                value={filters.query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="输入关键词搜索解决方案..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* 搜索建议 */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => {
                      handleQueryChange(suggestion.text);
                      setShowSuggestions(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span className="text-gray-900">{suggestion.text}</span>
                    <span className="text-xs text-gray-500 capitalize">{suggestion.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 分类筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分类
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部分类</option>
                <option value="react">React</option>
                <option value="vue">Vue.js</option>
                <option value="nodejs">Node.js</option>
                <option value="python">Python</option>
                <option value="ui">UI 设计</option>
                <option value="mobile">移动开发</option>
                <option value="backend">后端开发</option>
                <option value="devops">DevOps</option>
              </select>
            </div>

            {/* 编程语言 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                编程语言
              </label>
              <select
                value={filters.language}
                onChange={(e) => handleFilterChange('language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">不限语言</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="php">PHP</option>
                <option value="csharp">C#</option>
              </select>
            </div>

            {/* 难度等级 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                难度等级
              </label>
              <select
                value={filters.difficulty}
                onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">不限难度</option>
                <option value="beginner">初级</option>
                <option value="intermediate">中级</option>
                <option value="advanced">高级</option>
                <option value="expert">专家级</option>
              </select>
            </div>

            {/* 作者筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                作者
              </label>
              <input
                type="text"
                value={filters.author}
                onChange={(e) => handleFilterChange('author', e.target.value)}
                placeholder="输入作者名称"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 时间范围 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                发布时间
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">不限时间</option>
                <option value="today">今天</option>
                <option value="week">本周</option>
                <option value="month">本月</option>
                <option value="quarter">本季度</option>
                <option value="year">本年</option>
              </select>
            </div>

            {/* 排序方式 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                排序方式
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="relevance">相关度</option>
                <option value="newest">最新发布</option>
                <option value="oldest">最早发布</option>
                <option value="price-low">价格从低到高</option>
                <option value="price-high">价格从高到低</option>
                <option value="rating">评分最高</option>
                <option value="downloads">下载最多</option>
              </select>
            </div>
          </div>

          {/* 价格范围 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              价格范围: ¥{filters.priceRange[0]} - ¥{filters.priceRange[1]}
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="1000"
                value={filters.priceRange[0]}
                onChange={(e) => handleFilterChange('priceRange', [parseInt(e.target.value), filters.priceRange[1]])}
                className="flex-1"
              />
              <input
                type="range"
                min="0"
                max="1000"
                value={filters.priceRange[1]}
                onChange={(e) => handleFilterChange('priceRange', [filters.priceRange[0], parseInt(e.target.value)])}
                className="flex-1"
              />
            </div>
          </div>

          {/* 评分筛选 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              最低评分
            </label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleFilterChange('rating', rating === filters.rating ? 0 : rating)}
                  className={`p-1 rounded ${
                    rating <= filters.rating ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
              ))}
              <span className="text-sm text-gray-500 ml-2">
                {filters.rating > 0 ? `${filters.rating} 星及以上` : '不限评分'}
              </span>
            </div>
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标签
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {filters.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {['开源', '商业', '教程', '工具', '框架', '库', '模板', '插件'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => addTag(tag)}
                  disabled={filters.tags.includes(tag)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    filters.tags.includes(tag)
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 搜索历史 */}
          {searchHistory.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                搜索历史
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {searchHistory.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => useSearchHistory(item)}
                    className="w-full text-left p-2 rounded-md hover:bg-gray-50 border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-900">{item.query || '高级搜索'}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            重置筛选
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isLoading && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>搜索</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
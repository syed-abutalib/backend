// scripts/cleanBlogContent.js
import mongoose from 'mongoose';
import Blog from '../models/Blog.js';

async function cleanAllBlogs() {
  try {
    const blogs = await Blog.find({});
    
    for (const blog of blogs) {
      let updated = false;
      
      if (blog.description && blog.description.includes('\\u')) {
        blog.description = blog.description
          .replace(/\\u003c/g, '<')
          .replace(/\\u003e/g, '>')
          .replace(/\\u0022/g, '"')
          .replace(/\\u002f/g, '/')
          .replace(/\\/g, '');
        updated = true;
      }
      
      if (blog.excerpt && blog.excerpt.includes('\\u')) {
        blog.excerpt = blog.excerpt
          .replace(/\\u003c/g, '<')
          .replace(/\\u003e/g, '>')
          .replace(/\\/g, '');
        updated = true;
      }
      
      if (updated) {
        await blog.save();
        console.log(`Cleaned blog: ${blog.slug}`);
      }
    }
    
    console.log('All blogs cleaned successfully');
  } catch (error) {
    console.error('Error cleaning blogs:', error);
  }
}

// Run this once to clean your database
cleanAllBlogs();

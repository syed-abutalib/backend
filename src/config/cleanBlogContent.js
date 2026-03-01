// scripts/fixBlogContent.js
import mongoose from 'mongoose';
import Blog from '../models/Blog.js';

async function fixAllBlogContent() {
  try {
    const blogs = await Blog.find({});
    
    for (const blog of blogs) {
      let updated = false;
      
      if (blog.description && 
          (blog.description.includes('\\u003c') || blog.description.includes('\\\\u003c'))) {
        
        console.log(`Fixing blog: ${blog.slug}`);
        
        // Fix description
        blog.description = blog.description
          .replace(/\\\\u003c/g, '<')
          .replace(/\\\\u003e/g, '>')
          .replace(/\\\\u0022/g, '"')
          .replace(/\\\\u002f/g, '/')
          .replace(/\\u003c/g, '<')
          .replace(/\\u003e/g, '>')
          .replace(/\\u0022/g, '"')
          .replace(/\\u002f/g, '/')
          .replace(/\\/g, '');
        
        updated = true;
      }
      
      if (blog.excerpt && 
          (blog.excerpt.includes('\\u003c') || blog.excerpt.includes('\\\\u003c'))) {
        
        blog.excerpt = blog.excerpt
          .replace(/\\\\u003c/g, '<')
          .replace(/\\\\u003e/g, '>')
          .replace(/\\\\u0022/g, '"')
          .replace(/\\u003c/g, '<')
          .replace(/\\u003e/g, '>')
          .replace(/\\/g, '');
        
        updated = true;
      }
      
      if (updated) {
        await blog.save();
        console.log(`✅ Fixed blog: ${blog.slug}`);
      }
    }
    
    console.log('🎉 All blogs fixed successfully');
  } catch (error) {
    console.error('Error fixing blogs:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Run this
fixAllBlogContent();

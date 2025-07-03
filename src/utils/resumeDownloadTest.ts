// Test utility for resume download
// This file can be removed after testing

const testResumeDownload = (url: string) => {
  console.log('Testing resume download URL:', url);
  
  // Method 1: Try direct download with anchor element
  console.log('Method 1: Creating anchor element for download...');
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.download = 'test-resume.pdf';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Method 2: Try window.open as fallback
  setTimeout(() => {
    console.log('Method 2: Opening in new window...');
    window.open(url, '_blank');
  }, 1000);
};

// Test with your URL
const testUrl = 'https://res.cloudinary.com/dxwywphpl/image/upload/fl_attachment:Vikash_J_-_Resume.pdf/v1751399717/portfolio/resume/resume_1751399715703.pdf';

// Uncomment the line below to test
// testResumeDownload(testUrl);

console.log('Resume download test utility loaded. Call testResumeDownload(url) to test a specific URL.');
console.log('Example URL to test:', testUrl);

export { testResumeDownload };

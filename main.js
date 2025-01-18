import fs from 'fs/promises';
import path from 'path';
import MarkdownIt from 'markdown-it';
import mdKatex from '@iktakahiro/markdown-it-katex';
import puppeteer from 'puppeteer';

// Initialize markdown-it with options
const md = new MarkdownIt({
  html: true,
  breaks: true,
  typographer: true,
});

// Add KaTeX support
md.use(mdKatex, {
  throwOnError: false,
  errorColor: '#cc0000',
});

async function convertMarkdownToPDF(inputFile, outputFile) {
  try {
    // Read the Markdown file
    const markdownContent = await fs.readFile(inputFile, 'utf-8');

    // Convert Markdown to HTML
    const htmlContent = md.render(markdownContent);

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.7/dist/katex.min.css">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              padding: 2rem;
              max-width: 210mm;
              margin: 0 auto;
            }
            .katex { 
              font-size: 1em !important; 
            }
            .katex-display { 
              overflow-x: auto;
              padding: 1rem 0;
              margin: 1rem 0;
            }
            .katex-display > .katex { 
              text-align: left; 
              white-space: normal;
            }
            img {
              max-width: 100%;
              height: auto;
              display: block;
              margin: 1rem auto;
            }
            ol { 
              padding-left: 2rem;
              margin: 1rem 0;
              counter-reset: list-counter;
            }
            ol > li {
              margin: 1rem 0;
              position: relative;
              list-style: none;
            }
            ol > li:before {
              content: counter(list-counter) ".";
              counter-increment: list-counter;
              position: absolute;
              left: -2rem;
              width: 1.5rem;
              text-align: right;
            }
            p { margin: 0.5rem 0; }
            .math-block {
              margin: 1rem 0;
              overflow-x: auto;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Set content and wait for network and rendering to complete
    await page.setContent(fullHtml);

    // Wait for KaTeX to load and render
    await page.evaluate(() => {
      return new Promise((resolve) => {
        // Add a small delay to ensure KaTeX has time to render
        setTimeout(resolve, 1000);
      });
    });

    await page.pdf({
      path: outputFile,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '2cm',
        right: '2cm',
        bottom: '2cm',
        left: '2cm',
      },
    });

    await browser.close();

    console.log(`PDF created successfully: ${outputFile}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

const inputFile = process.argv[2];

if (!inputFile) {
  console.error('Please provide a path to a Markdown file.');
  console.error('Usage: node markdown-to-pdf.js <input-file.md>');
  process.exit(1);
}

const outputFile = path.join(
  path.dirname(inputFile),
  `${path.basename(inputFile, '.md')}.pdf`
);

convertMarkdownToPDF(inputFile, outputFile);

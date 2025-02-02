import fs from 'fs/promises';
import path from 'path';
import {exec} from 'child_process';
import MarkdownIt from 'markdown-it';
import mdKatex from '@iktakahiro/markdown-it-katex';
import puppeteer from 'puppeteer';

const md = new MarkdownIt({
  html: true,
  breaks: true,
  typographer: true,
});

md.use(mdKatex, {
  throwOnError: false,
  errorColor: '#cc0000',
});

async function convertMarkdownToPDF(inputFile, outputFile) {
  try {
    const markdownContent = await fs.readFile(inputFile, 'utf-8');
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
            .katex { font-size: 1em !important; }
            .katex-display { overflow-x: auto; padding: 1rem 0; margin: 1rem 0; }
            .katex-display > .katex { text-align: left; white-space: normal; }
            img { max-width: 100%; height: auto; display: block; margin: 1rem auto; }
            ol { padding-left: 2rem; margin: 1rem 0; counter-reset: list-counter; }
            ol > li { margin: 1rem 0; position: relative; list-style: none; }
            ol > li:before {
              content: counter(list-counter) ".";
              counter-increment: list-counter;
              position: absolute;
              left: -2rem;
              width: 1.5rem;
              text-align: right;
            }
            p { margin: 0.5rem 0; }
            .math-block { margin: 1rem 0; overflow-x: auto; }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(fullHtml);

    // Wait for KaTeX to render
    await page.evaluate(() => {
      return new Promise((resolve) => setTimeout(resolve, 1000));
    });

    // Generate the uncompressed PDF
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

    // Compress via Ghostscript after creation
    const compressedFile = outputFile.replace(/\.pdf$/, '-compressed.pdf');
    await new Promise((resolve, reject) => {
      const cmd = [
        'gs',
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        '-dPDFSETTINGS=/screen',
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        `-sOutputFile="${compressedFile}"`,
        `"${outputFile}"`,
      ].join(' ');

      exec(cmd, (error) => {
        if (error) {
          return reject(error);
        }
        console.log(`Compressed PDF created successfully: ${compressedFile}`);
        resolve();
      });
    });

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

import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { existsSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'node:path';

dotenv.config();
const notion = new Client({auth : process.env.NOTION_API_KEY});
const n2m = new NotionToMarkdown({ 
    notionClient: notion,
    config: {
        seperateChildPage: true,
    }
});
const databaseId = process.env.DATABASE_ID;
  
(async () => {
    try {
        const response = await notion.databases.query({
        database_id: databaseId,
        sorts: [
            {
                property: 'Name',
                direction: 'ascending',
            },
        ],
      });

    const saveDirectory = './operate';
    const imageDirectory = './images'

    if (!existsSync(saveDirectory)){
        mkdirSync(saveDirectory);
    }

    if (!existsSync(imageDirectory)){
        mkdirSync(imageDirectory);
    }


    const pages = response.results.map(page => {
        const pageId = page.id;
        const name = page.properties?.Name?.title?.[0]?.text?.content;
      
        return {
          pageId: pageId,
          name: name
        };
      });

      for (let page of pages){
        const mdblocks = await n2m.pageToMarkdown(page.pageId);
        const mdString = n2m.toMarkdownString(mdblocks);
        let content = mdString.parent || '';

        const imageDir = `${imageDirectory}/${page.name.replace(/[^\w\-]/g, '_')}`;
        if (!existsSync(imageDir)) mkdirSync(imageDir);

        const matches = content.match(/!\[([^\]]*)\]\((https:\/\/[^)]+amazonaws\.com[^)]+)\)/g) || [];
        
        for (let i = 0; i < matches.length; i++){
            const url = matches[i].match(/\((.*?)\)/)[1];
            const cleanUrl = url.split('?')[0];
            const ext = path.extname(cleanUrl);
            const fileName = `image${i+1}${ext}`;
            const localPath = `${imageDir}/${fileName}`;

            try {
              const res = await axios.get(url, { responseType: 'arraybuffer'});
              writeFileSync(localPath, res.data);
              content = content.replace(url, `../images/${page.name.replace(/[^\w\-]/g, '_')}/${fileName}`);
            } catch (e) {
              console.warn(`이미지 다운로드 실패: ${url}`, e.message);
            }
        }

        const filePath = `${saveDirectory}/${page.name}.md`;
        const mdHead = `# 📒 ${page.name}\n`
        const mdContent = mdHead+content;
        if (Object.keys(mdString).length == 0) writeFileSync(filePath, mdHead, "utf8");
        else writeFileSync(filePath, mdContent, "utf8");
      }
    } catch (error){
        console.error("다음과 같은 오류 발생:", error);
    }
})();
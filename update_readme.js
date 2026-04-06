import { Client } from '@notionhq/client';
import { writeFileSync } from 'node:fs';
import dotenv from 'dotenv';

dotenv.config();
const notion = new Client({auth : process.env.NOTION_API_KEY});
const databaseId = process.env.DATABASE_ID;
  
(async () => {
    const response = await notion.databases.query({
        database_id: databaseId,
        sorts: [
            {
                property: 'Name',
                direction: 'ascending',
            },
        ],
    });

    let mdContent = `# 📚 Redhat Hands-on Labs\n\n\n✍🏻Redhat Hands-on에서 Operate 섹션만 정리했습니다.\n\n\n`;

    const pages = response.results.map(page => {
    const name = page.properties?.Name?.title?.[0]?.text?.content;
    const rawDate = page.properties?.Date?.date?.start;
    const date = rawDate ? new Date(rawDate).toISOString().split('T')[0] : "";
      
    return {
            name: name,
            date: date
        };
    });

    mdContent += `<table>\n<thead>\n<tr>\n<th>📒Section</th>\n<th>📅Date</th>\n</tr>\n</thead>\n<tbody>\n`

    for (let page of pages){
        mdContent += `<tr>\n<td>${page.name}</td>\n`;
        mdContent += (page.date) ? `<td>${page.date}</td>\n</tr>\n` : `<td></td>\n</tr>\n`;
    }

    mdContent += `</tbody>\n</table>\n`;
      
    writeFileSync("README.md", mdContent, "utf8", (e) => {
        console.log(e);
    });
})();

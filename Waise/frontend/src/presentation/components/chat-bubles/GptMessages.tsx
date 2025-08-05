import { useEffect, useRef } from "react";
import Markdown from "react-markdown";

interface Props {
  text: string;
  iconSrc: string;
  isLastMessage?: boolean;
}

type MarkdownBlock =
  | { type: 'text'; content: string }
  | { type: 'table'; content: string }
  | { type: 'ascii-table'; content: string };

const isMarkdownTableLine = (line: string) => {
  return line.includes('|') && line.split('|').length > 2;
};

const isAsciiTableLine = (line: string) => {
  return /^\s*\+[-+]+\+\s*$/.test(line) || /^\s*\|.*\|\s*$/.test(line);
};

const isTableSeparatorLine = (line: string) => {
  return /^[-\s|]+$/.test(line);
};

const extractMarkdownBlocks = (text: string = ''): MarkdownBlock[] => {
  const lines = text.split('\n');
  const blocks: MarkdownBlock[] = [];
  let current: string[] = [];
  let currentType: MarkdownBlock['type'] | null = null;

  const pushBlock = () => {
    if (current.length === 0) return;
    const blockText = current.join('\n').trim();
    if (blockText === '') return;
    blocks.push({ type: currentType || 'text', content: blockText });
    current = [];
    currentType = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isTableSeparatorLine(line) && currentType !== 'table' && currentType !== 'ascii-table') continue;
    if (isAsciiTableLine(line)) {
      if (currentType !== 'ascii-table') pushBlock();
      currentType = 'ascii-table';
      current.push(line);
    } else if (isMarkdownTableLine(line)) {
      if (currentType !== 'table') pushBlock();
      currentType = 'table';
      current.push(line);
    } else {
      if (currentType !== 'text') pushBlock();
      currentType = 'text';
      current.push(line);
    }
  }
  pushBlock();
  return blocks;
};

const parseMarkdownTable = (markdown: string) => {
  const lines = markdown.trim().split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2 || !/^\s*\|?[-:\s|]+\|?\s*$/.test(lines[1])) {
    const headerCells = lines[0].split('|');
    const separatorLine = headerCells.map(() => '---').join('|');
    lines.splice(1, 0, separatorLine);
  }
  const [headerLine, , ...rows] = lines;
  const headers = headerLine.split('|').map(h => h.trim()).filter(Boolean);
  return rows
    .filter(row => {
      const trimmed = row.trim();
      return (
        trimmed !== '' &&
        !/^(\|?\s*-{2,}\s*)+\|?$/.test(trimmed)
      );
    })
    .map(row => {
      const values = row.split('|').map(cell => cell.trim()).filter(Boolean);
      return headers.reduce((obj, header, index) => {
        obj[header] = values[index] || '';
        return obj;
      }, {} as Record<string, string>);
    });
};

const parseAsciiTable = (ascii: string) => {
  const lines = ascii.trim().split('\n').filter(l => l.includes('|'));
  const rows = lines.map(line =>
    line
      .trim()
      .split('|')
      .slice(1, -1)
      .map(cell => cell.trim())
  );
  const headers = rows[0];
  const dataRows = rows.slice(1).filter(row => !row.some(cell => /^-+$/.test(cell)));
  return dataRows.map(row => {
    return headers.reduce((obj, header, index) => {
      obj[header] = row[index] || '';
      return obj;
    }, {} as Record<string, string>);
  });
};

const MarkdownTableRenderer = ({ markdown }: { markdown: string }) => {
  const data = parseMarkdownTable(markdown);
  if (data.length === 0) return null;
  const headers = Object.keys(data[0]);

  // Función para renderizar links markdown como solo el nombre clicable
  function renderCellContent(cell: string) {
    // Detecta [texto](url)
    const mdLink = cell.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (mdLink) {
      const label = mdLink[1];
      const href = mdLink[2];
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', fontWeight: 'bold', textDecoration: 'underline' }}>
          {label} <span style={{ fontSize: '1em' }}>🔗</span>
        </a>
      );
    }
    // Si no es link markdown, renderiza como markdown normal (puede contener links sueltos)
    return (
      <Markdown
        components={{
          a: (props) => {
            let label = props.children?.toString();
            let href = props.href || "";
            if (label === "URL" || label === "Ver fuente") {
              try {
                const urlObj = new URL(href);
                label = urlObj.hostname.replace(/^www\./, "");
              } catch {
                label = "Ver fuente";
              }
            }
            return (
              <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', fontWeight: 'bold', textDecoration: 'underline' }}>
                {label} <span style={{ fontSize: '1em' }}>🔗</span>
              </a>
            );
          }
        }}
      >{cell}</Markdown>
    );
  }

  return (
    <div className="overflow-x-auto my-4 w-full max-w-full">
      <table className="table-auto border border-gray-300 text-sm">
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="border border-gray-300 px-2 py-1 bg-gray-100 text-left max-w-[200px] break-words whitespace-pre-wrap align-top"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              {headers.map((header) => (
                <td
                  key={header}
                  className="border border-gray px-2 py-1 max-w-[200px] break-words whitespace-pre-wrap align-top"
                  title={row[header]}
                >
                  {renderCellContent(row[header])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const VisualAsciiTableRenderer = ({ ascii }: { ascii: string }) => {
  const data = parseAsciiTable(ascii);
  if (data.length === 0) return null;
  const headers = Object.keys(data[0]);

  // Función para renderizar links markdown como solo el nombre clicable (igual que en MarkdownTableRenderer)
  function renderCellContent(cell: string) {
    const mdLink = cell.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (mdLink) {
      const label = mdLink[1];
      const href = mdLink[2];
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', fontWeight: 'bold', textDecoration: 'underline' }}>
          {label} <span style={{ fontSize: '1em' }}>🔗</span>
        </a>
      );
    }
    return (
      <Markdown
        components={{
          a: (props) => {
            let label = props.children?.toString();
            let href = props.href || "";
            if (label === "URL" || label === "Ver fuente") {
              try {
                const urlObj = new URL(href);
                label = urlObj.hostname.replace(/^www\./, "");
              } catch {
                label = "Ver fuente";
              }
            }
            return (
              <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', fontWeight: 'bold', textDecoration: 'underline' }}>
                {label} <span style={{ fontSize: '1em' }}>🔗</span>
              </a>
            );
          }
        }}
      >{cell}</Markdown>
    );
  }

  return (
    <div className="overflow-auto my-4">
      <table className="table-auto border border-gray-300 w-full text-sm">
        <thead>
          <tr>
            {headers.map(header => (
              <th key={header} className="border border-gray-300 p-2 bg-gray-100 text-left">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              {headers.map(header => (
                <td key={header} className="border border-gray-300 p-2">
                  {renderCellContent(row[header])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const urlRegex = /(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)/g;

// --- FICHA RENDERER ---
function isFichaBlock(content: string) {
  // Detecta si al menos 3 líneas tienen el patrón ficha
  const fichaLines = content.split('\n').filter(line => /^\*\*[^*]+:\*\*/.test(line));
  return fichaLines.length >= 3;
}

function FichaRenderer({ content }: { content: string }) {
  const lines = content.split('\n').filter(line => /^\*\*[^*]+:\*\*/.test(line));
  return (
    <dl className="mb-2">
      {lines.map((line, idx) => {
        const match = line.match(/^\*\*([^*]+):\*\*\s*(.*)$/);
        if (!match) return null;
        return (
          <div key={idx} className="flex flex-row mb-1">
            <dt className="font-bold min-w-[120px]">{match[1]}:</dt>
            <dd className="ml-2">{match[2]}</dd>
          </div>
        );
      })}
    </dl>
  );
}

const GptMessages = ({ text, iconSrc, isLastMessage }: Props) => {
  const contentRef = useRef<HTMLDivElement>(null);

  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messageRef.current) {
      // Usar requestAnimationFrame para asegurar que el DOM se ha actualizado
      requestAnimationFrame(() => {
        messageRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
          inline: "nearest"
        });
      });
    }
  }, [text]); 

  // Limpieza de texto antes de formatear URLs y filtrado de líneas irrelevantes
  const urlRegex = /(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)/g;
  const cleanText = text
    .split('\n')
    .filter(line =>
      !/No especificado|No disponible|No especificada|URL no disponible|Sin fecha relevante|Not applicable|Not specified|No aplicable|Sin fecha|No date|No definido|unknown|No mencionada.|No mencionado.|No especificada.|No especificado.|Sin URL|Untitled/i.test(line)
    )
    .map(line => {
      // Estandariza líneas que empiezan con "- URL:" o "URL:"
      const urlMatch = line.match(/^-?\s*URL:\s*(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)/i);
      if (urlMatch) {
        let cleanUrl = urlMatch[1].trim().replace(/[)\]\}\.,@]+$/, "");
        try {
          const urlObj = new URL(cleanUrl);
          const domain = urlObj.hostname.replace(/^www\./, "");
          return `- [${domain}](${cleanUrl})`;
        } catch {
          return `- [Ver fuente](${cleanUrl})`;
        }
      }
      // Si la línea ya contiene un enlace Markdown, no hagas nada
      if (/\[.*?\]\(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+\)/.test(line)) {
        return line;
      }
      // Si la línea contiene una URL suelta, la convierte a Markdown con el dominio
      return line.replace(urlRegex, (url) => {
        let cleanUrl = url.trim().replace(/[)\]\}\.,@]+$/, "");
        try {
          const urlObj = new URL(cleanUrl);
          const domain = urlObj.hostname.replace(/^www\./, "");
          return `[${domain}](${cleanUrl})`;
        } catch {
          return `[Ver fuente](${cleanUrl})`;
        }
      });
    })
    .join('\n');

  const blocks = extractMarkdownBlocks(cleanText);

  return (
    <div className="col-start-1 col-end-10 p-3 rounded-lg" ref={messageRef}>
      <div className="flex flex-row items-start">
      <div className="flex items-center justify-center h-12 w-12 min-h-12 min-w-12 rounded-full border border-gray-600">
          <img src={iconSrc} alt="AI Icon" className="h-10 w-10" />
        </div>
        <div className="relative ml-3 text-xs text-black pt-3 pb-2 px-4 text-justify leading-relaxed break-words overflow-wrap">
          {blocks.map((block, index) => {
            if (block.type === 'table') {
              return <MarkdownTableRenderer key={index} markdown={block.content} />;
            } else if (block.type === 'ascii-table') {
              return <VisualAsciiTableRenderer key={index} ascii={block.content} />;
            } else if (isFichaBlock(block.content)) {
              return <FichaRenderer key={index} content={block.content} />;
            } else {
              return (
                <Markdown
                  key={index}
                  components={{
                    a: (props) => {
                      let label = props.children?.toString();
                      let href = props.href || "";
                      // Si el label es "URL" o "Ver fuente", muestra el dominio
                      if (label === "URL" || label === "Ver fuente") {
                        try {
                          const urlObj = new URL(href);
                          label = urlObj.hostname.replace(/^www\./, "");
                        } catch {
                          label = "Ver fuente";
                        }
                      }
                      return (
                        <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', fontWeight: 'bold', textDecoration: 'underline' }}>
                          {label} <span style={{ fontSize: '1em' }}>🔗</span>
                        </a>
                      );
                    }
                  }}
                >{block.content}</Markdown>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
};

export default GptMessages;

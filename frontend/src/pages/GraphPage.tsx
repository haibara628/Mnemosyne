import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGraph } from '../hooks/useLinks';

export default function GraphPage() {
  const { data, isLoading } = useGraph();
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!data || !containerRef.current) return;

    // Simple SVG-based graph visualization (no external dependency needed for Phase 1)
    const container = containerRef.current;
    const { nodes, edges } = data;

    if (nodes.length === 0) {
      container.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400"><p>No links yet. Create some [[wiki-links]] between notes!</p></div>';
      return;
    }

    // Simple force-directed layout
    const width = container.clientWidth;
    const height = container.clientHeight;
    const cx = width / 2;
    const cy = height / 2;

    // Position nodes in a circle
    const radius = Math.min(width, height) * 0.35;
    const nodePositions: Record<string, { x: number; y: number }> = {};
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      nodePositions[node.id] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });

    container.innerHTML = `
      <svg width="${width}" height="${height}" style="background: #fafbfc;">
        <!-- Edges -->
        ${edges.map((e) => {
          const s = nodePositions[e.source];
          const t = nodePositions[e.target];
          if (!s || !t) return '';
          return `<line x1="${s.x}" y1="${s.y}" x2="${t.x}" y2="${t.y}" stroke="#d1d5db" stroke-width="1" stroke-opacity="0.6"/>`;
        }).join('')}
        <!-- Nodes -->
        ${nodes.map((n) => {
          const p = nodePositions[n.id];
          if (!p) return '';
          return `
            <g class="graph-node cursor-pointer" data-id="${n.id}">
              <circle cx="${p.x}" cy="${p.y}" r="6" fill="#059669" stroke="#fff" stroke-width="2"/>
              <text x="${p.x}" y="${p.y + 18}" text-anchor="middle" font-size="11" fill="#374151" font-family="system-ui">${escapeXml(n.label.substring(0, 20))}</text>
            </g>
          `;
        }).join('')}
      </svg>
    `;

    // Add click handlers
    container.querySelectorAll('.graph-node').forEach((el) => {
      el.addEventListener('click', () => {
        const noteId = el.getAttribute('data-id');
        if (noteId) navigate(`/notes/${noteId}`);
      });
    });
  }, [data, navigate]);

  return (
    <div className="flex-1 overflow-hidden p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Knowledge Graph</h1>
      <p className="text-sm text-gray-500 mb-4">
        {data
          ? `${data.nodes.length} nodes, ${data.edges.length} links`
          : 'Loading...'}
      </p>
      <div
        ref={containerRef}
        className="w-full h-[calc(100vh-200px)] border border-gray-200 rounded-xl overflow-hidden bg-gray-50"
      >
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

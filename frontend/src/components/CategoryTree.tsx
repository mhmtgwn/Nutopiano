'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

export interface CategoryTreeNode {
  id: number;
  name: string;
  slug: string;
  children?: CategoryTreeNode[];
}

interface CategoryTreeProps {
  categories: CategoryTreeNode[];
  selectedId?: number | null;
  onSelectCategory?: (id: number) => void;
  onClearCategory?: () => void;
  className?: string;
}

interface CategoryNodeProps {
  category: CategoryTreeNode;
  selectedId?: number | null;
  onSelectCategory?: (id: number) => void;
  level?: number;
}

function CategoryNode({ category, selectedId, onSelectCategory, level = 0 }: CategoryNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;
  const isSelected = selectedId === category.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
          isSelected
            ? 'bg-indigo-100 text-indigo-700 font-medium'
            : 'hover:bg-gray-100 text-gray-700'
        }`}
        style={{ paddingLeft: `${(level + 1) * 12}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 p-0 hover:bg-gray-200 rounded transition-colors"
          >
            <ChevronRight
              size={16}
              className={`transform transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          </button>
        ) : (
          <div className="flex-shrink-0 w-4" />
        )}
        <button
          onClick={() => onSelectCategory?.(category.id)}
          className="flex-1 text-left truncate"
        >
          {category.name}
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {category.children!.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              selectedId={selectedId}
              onSelectCategory={onSelectCategory}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryTree({
  categories,
  selectedId,
  onSelectCategory,
  onClearCategory,
  className = '',
}: CategoryTreeProps) {
  return (
    <div className={`border border-gray-200 rounded-lg bg-white p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Kategoriler</h3>
        {selectedId && (
          <button
            onClick={onClearCategory}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Temizle
          </button>
        )}
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">Kategori yok</p>
      ) : (
        <div className="space-y-1">
          {categories.map((category) => (
            <CategoryNode
              key={category.id}
              category={category}
              selectedId={selectedId}
              onSelectCategory={onSelectCategory}
            />
          ))}
        </div>
      )}
    </div>
  );
}

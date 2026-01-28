/**
 * search_kb Tool
 *
 * Searches the knowledge base for relevant articles
 */

import { searchArticles, getArticlesByCategory } from '@/lib/db/kbDb';
import type {
  SearchKbInput,
  SearchKbOutput,
  ToolResult,
} from '@/lib/types';

/**
 * Search knowledge base articles
 *
 * @param input - Search parameters
 * @returns Tool result with articles
 */
export async function searchKb(
  input: SearchKbInput
): Promise<ToolResult<SearchKbOutput>> {
  try {
    const { query, category, limit = 5 } = input;

    // Validate input
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        error: 'Query parameter is required and cannot be empty',
      };
    }

    // If category is specified, filter by category first
    let articles;
    if (category) {
      articles = await getArticlesByCategory(category);
      // Then filter by query within that category
      const queryLower = query.toLowerCase();
      articles = articles.filter(
        (article) =>
          article.title.toLowerCase().includes(queryLower) ||
          article.content.toLowerCase().includes(queryLower)
      );
      articles = articles.slice(0, limit);
    } else {
      // General search across all categories
      articles = await searchArticles(query, limit);
    }

    return {
      success: true,
      output: {
        articles: articles.map((article) => ({
          id: article.id,
          title: article.title,
          category: article.category,
          content: article.content,
          created_at: article.created_at,
        })),
        count: articles.length,
      },
    };
  } catch (error) {
    console.error('Error in search_kb tool:', error);
    return {
      success: false,
      error: `Failed to search knowledge base: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

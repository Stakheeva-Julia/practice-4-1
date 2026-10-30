// src/mock-api.ts
import { Book } from './task1-types';

// 1. Функция задержки
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 2. Асинхронное получение книг
export async function fetchBooks(): Promise<Book[]> {
  // Имитация загрузки по сети
  await delay(800);

  if (Math.random() < 0.2) {
    throw new Error('Сбой сети. Не удалось загрузить книги.');
  }

  const raw = localStorage.getItem('catalog');
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : (parsed.books || []);
  } catch {
    return [];
  }
}

// 3. Асинхронное сохранение книг
export async function saveBooks(books: Book[]): Promise<void> {
  await delay(500);
  localStorage.setItem('catalog', JSON.stringify(books));
}
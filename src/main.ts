import './styles.css';
import { Book } from './task1-types';
import { applyFilters, filterByAuthor, filterByMinYear } from './task3-filters';
import { createBookFromForm } from "./task4-integration";
import { filterByTitle, sortBooks } from './task5-utils';
import { BookCatalog } from './task6-classes';
import { Wishlist } from './task7-wishlist';

// ============================================================
// ИСХОДНОЕ СОСТОЯНИЕ
// ============================================================
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success', data: T }
  | { status: 'error', message: string };

let state: AsyncState<Book[]> = { status: 'loading' };
let saveErrorMessage = '';

let catalog = new BookCatalog('main', []);
let wishlist = new Wishlist();

// Загрузка из localStorage (в практике 4-1 переедет в mock-api.ts)
async function fetchBooks(): Promise<Book[]> {
  await new Promise(resolve => setTimeout(resolve, 800));
  if (Math.random() < 0.2) {
    throw new Error('Сбой сети. Не удалось загрузить книги.');
  }
  const savedCatalog = localStorage.getItem('catalog');
  if (savedCatalog) {
    const parsed = JSON.parse(savedCatalog);
    return parsed.books;
  }
  return [
    { id: '1', title: 'TypeScript Guide', authors: ['John Doe'], year: 2024 },
    { id: '2', title: 'JavaScript Basics', authors: ['Jane Smith'], year: 2022 },
  ];
}

const savedWishlist = localStorage.getItem('wishlist');
if (savedWishlist) {
  wishlist = new Wishlist(JSON.parse(savedWishlist));
}

// ============================================================
// СОХРАНЕНИЕ (в практике 4-1 переедет в mock-api.ts)
// ============================================================
async function saveBooks(books: Book[]): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 500));
  localStorage.setItem('catalog', JSON.stringify({
    id: catalog.id,
    books: books
  }));
}

async function saveCatalog() {
  try {
    await saveBooks(catalog.getBooks());
    saveErrorMessage = '';
  } catch (error) {
    saveErrorMessage = error instanceof Error ? error.message : 'Ошибка сохранения';
    setTimeout(() => {
      saveErrorMessage = '';
      render();
    }, 3000);
  }
}

function saveWishlist() {
  localStorage.setItem('wishlist', JSON.stringify(wishlist.getFavoriteIds()));
}

// ============================================================
// DOM-элементы
// ============================================================
const bookList = document.querySelector('#bookList') as HTMLDivElement;
const wishlistContainer = document.querySelector('#wishlistContainer') as HTMLDivElement;
const form = document.querySelector('#bookForm') as HTMLFormElement;
const filterBtn = document.querySelector('#applyFilters') as HTMLButtonElement;
const authorInput = document.querySelector('#filterAuthor') as HTMLInputElement;
const yearInput = document.querySelector('#filterYear') as HTMLInputElement;
const errorMessage = document.querySelector('#errorMessage') as HTMLDivElement;
const searchInput = document.querySelector('#searchInput') as HTMLInputElement;
const sortBySelect = document.querySelector('#sortBy') as HTMLSelectElement;

// ============================================================
// СОЗДАНИЕ КАРТОЧКИ
// ============================================================
function createBookCard(book: Book): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'book-card';

  const titleEl = document.createElement('h3');
  titleEl.textContent = `${book.title} — ${book.authors.join(', ')}${book.year ? `, ${book.year}` : ''}`;
  card.append(titleEl);

  if (book.rating !== undefined) {
    const ratingEl = document.createElement('p');
    ratingEl.textContent = `Рейтинг: ${book.rating}`;
    card.append(ratingEl);
  }

  // Кнопка «Удалить»
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Удалить';
  deleteBtn.addEventListener('click', async () => {
    catalog.removeBook(book.id);
    await saveCatalog();
    if (state.status === 'success') {
      state = { status: 'success', data: catalog.getBooks() };
    }
    render();
  });
  card.append(deleteBtn);

  // Кнопка «Избранное» 
  const favBtn = document.createElement('button');
  favBtn.textContent = wishlist.has(book.id) ? '❤️ В избранном' : '🤍 В избранное';
  favBtn.addEventListener('click', () => {
    wishlist.toggle(book.id);
    saveWishlist();
    updateView();
  });
  card.append(favBtn);

  return card;
}

// ============================================================
// ОТРИСОВКА
// ============================================================
function renderBooks(books: Book[]) {
  bookList.innerHTML = '';

  if (books.length === 0) {
    bookList.textContent = 'Книги не найдены. Попробуйте изменить фильтры.';
    return;
  }

  books.forEach(book => {
    bookList.append(createBookCard(book));
  });
}

function renderWishlist() {
  wishlistContainer.innerHTML = '';
  const favBooks = wishlist.getFavorites(catalog);

  if (favBooks.length === 0) {
    wishlistContainer.textContent = 'Пока ничего не добавлено';
    return;
  }

  favBooks.forEach(book => {
    wishlistContainer.append(createBookCard(book));
  });
}

// Единая функция обновления вида
function updateView() {
  const filters: ((book: Book) => boolean)[] = [];
  if (authorInput.value.trim()) filters.push(filterByAuthor(authorInput.value.trim()));
  if (yearInput.value) filters.push(filterByMinYear(parseInt(yearInput.value, 10)));
  if (searchInput.value.trim()) filters.push(filterByTitle(searchInput.value.trim()));

  const allBooks = catalog.getBooks();
  const filtered = applyFilters(allBooks, filters);
  const sorted = sortBooks(filtered, sortBySelect.value as 'year' | 'rating');

  renderBooks(sorted);
  renderWishlist();
}

function render() {
  bookList.innerHTML = '';
  wishlistContainer.innerHTML = '';

  if (saveErrorMessage) {
    const saveErrorDiv = document.createElement('div');
    saveErrorDiv.textContent = saveErrorMessage;
    saveErrorDiv.style.color = 'orange';
    bookList.append(saveErrorDiv);
  }

  switch (state.status) {
    case 'idle':
      bookList.textContent = 'Нажмите для загрузки...';
      break;
    case 'loading':
      bookList.textContent = 'Загрузка данных...';
      break;
    case 'success':
      updateView();
      break;
    case 'error':
      const errorDiv = document.createElement('div');
      errorDiv.textContent = state.message;
      errorDiv.style.color = 'red';
      const retryBtn = document.createElement('button');
      retryBtn.textContent = 'Повторить попытку';
      retryBtn.addEventListener('click', initApp);
      errorDiv.append(retryBtn);
      bookList.append(errorDiv);
      break;
  }
}

// Первичная отрисовка
async function initApp() {
  state = { status: 'loading' };
  saveErrorMessage = '';
  render();
  try {
    const books = await fetchBooks();
    catalog = new BookCatalog('main', books);
    state = { status: 'success', data: books };
  } catch (error) {
    state = { status: 'error', message: error instanceof Error ? error.message : 'Неизвестная ошибка' };
  }
  render();
}

document.addEventListener('DOMContentLoaded', initApp);

// ============================================================
// ОБРАБОТЧИК ФОРМЫ
// ============================================================
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMessage.textContent = '';
  if (state.status !== 'success') return;

  try {
    const formData = new FormData(form);
    const newBook = createBookFromForm(formData);
    catalog.addBook(newBook);
    await saveCatalog();
    state = { status: 'success', data: catalog.getBooks() };
    form.reset();
    render();
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.textContent = error.message;
    }
  }
});

// ============================================================
// ФИЛЬТРЫ И СОРТИРОВКА
// ============================================================
filterBtn.addEventListener('click', updateView);
searchInput.addEventListener('input', updateView);
sortBySelect.addEventListener('change', updateView);

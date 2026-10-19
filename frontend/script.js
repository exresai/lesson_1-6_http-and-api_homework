// Стартовая точка домашней работы.
// Спроектируйте модель ресурса, запросы и состояния самостоятельно.

"use strict";

const API_URL = "http://localhost:3000/games";
const REQUEST_TIMEOUT = 5000;
const pendingDeleteIds = new Set();

const statusBox = document.querySelector('[data-ui="status"]');
const formStatus = document.querySelector('[data-ui="form-status"]');
const collection = document.querySelector('[data-ui="collection"]');
const statusTitle = document.querySelector(".status__title");
const statusText = document.querySelector(".status__text");

const reloadButton = document.querySelector('[data-action="reload"]');
const entryForm = document.querySelector('[data-form="entry"]');
const submitButton = document.querySelector('[data-action="submit"]');
const sortSelect = document.querySelector('[data-action="sort"]');

function showLoadingState() {
    statusBox.classList.remove("status--success", "status--error");
    statusBox.classList.add("status--loading");

    statusTitle.textContent = "Загрузка";
    statusText.textContent = "Получаем список игр из API...";

    collection.replaceChildren();
}

function showErrorState() {
    collection.replaceChildren();

    statusBox.classList.remove(
        "status--loading",
        "status--success"
    );
    statusBox.classList.add("status--error");

    statusTitle.textContent = "Ошибка загрузки";
    statusText.textContent = "Не удалось получить список игр. Представьте, что он тут есть";
}

function showTimeoutState() {
    collection.replaceChildren();

    statusBox.classList.remove(
        "status--loading",
        "status--success"
    );
    statusBox.classList.add("status--error");

    statusTitle.textContent = "Превышено время ожидания";
    statusText.textContent = "API не ответил вовремя. Зачем вы это сломали";
}

function showEmptyState() {
    collection.replaceChildren();

    statusBox.classList.remove(
        "status--loading",
        "status--success",
        "status--error"
    );

    statusTitle.textContent = "Список пуст";
    statusText.textContent = "В каталоге пока нет ни одной игры";
}

function showDeleteError() {
    statusBox.classList.remove(
        "status--loading",
        "status--success"
    );
    statusBox.classList.add("status--error");

    statusTitle.textContent = "Не удалось удалить игру";
    statusText.textContent = "Изменение отменено: карточка возвращена в список.";
}

function getGamesUrl() {
    const sortValue = sortSelect.value;

    if (sortValue === "rating-desc") {
        return `${API_URL}?_sort=-rating`;
    }
    if (sortValue === "rating-asc") {
        return `${API_URL}?_sort=rating`;
    }
    if (sortValue === "year-desc") {
        return `${API_URL}?_sort=-releaseYear`;
    }
    if (sortValue === "year-asc") {
        return `${API_URL}?_sort=releaseYear`;
    }

    return API_URL;
}

async function loadGames() {
    showLoadingState();

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
        controller.abort();
    }, REQUEST_TIMEOUT);

    try {
        const requestUrl = getGamesUrl();
        const response = await fetch(requestUrl, {
            method: "GET",
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }

        const games = await response.json();

        renderGames(games);
    } catch (error) {
        if (error.name === "AbortError") {
            console.error("Запрос отменен по тайм-ауту:", error);
            showTimeoutState();
        } else {
            console.error("Не удалось загрузить игры:", error);
            showErrorState();
        }
    } finally {
        clearTimeout(timeoutId);
    }
}

function renderGames(games) {
    collection.replaceChildren();

    if (games.length === 0) {
        showEmptyState();
        return;
    }

    games.forEach((game) => {
        const card = document.createElement("article");
        card.classList.add("card");
        card.dataset.gameId = game.id;

        const title = document.createElement("h3");
        title.classList.add("card__title");
        title.textContent = game.title;

        const meta = document.createElement("div");
        meta.classList.add("card__meta");

        const genre = document.createElement("p");
        genre.textContent = `Жанр: ${game.genre}`;

        const platform = document.createElement("p");
        platform.textContent = `Платформа: ${game.platform}`;

        const releaseYear = document.createElement("p");
        releaseYear.textContent = `Год выхода: ${game.releaseYear}`;

        const rating = document.createElement("p");
        rating.textContent = `Оценка: ${game.rating}/10`;

        meta.append(genre, platform, releaseYear, rating);

        const deleteButton = document.createElement("button");
        deleteButton.classList.add("button", "button--secondary");
        deleteButton.type = "button";
        deleteButton.textContent = "Удалить";
        deleteButton.dataset.gameId = game.id;

        deleteButton.addEventListener("click", async () => {
            const confirmed = window.confirm(
                `Разонравилась? "${game.title}"?`
            );

            if (!confirmed) {
                return;
            }
            if (pendingDeleteIds.has(game.id)) {
                return;
            }

            pendingDeleteIds.add(game.id);
            deleteButton.disabled = true;

            const nextCard = card.nextSibling;
            card.remove();

            try {
                await deleteGame(game.id);
                await loadGames();
            } catch (error) {
                console.error("Не удалось удалить игру:", error);
                collection.insertBefore(card, nextCard);
                showDeleteError();
            } finally {
                pendingDeleteIds.delete(game.id);
                if (card.isConnected) {
                    deleteButton.disabled = false;
                }
            }
        });

        card.append(title, meta, deleteButton);
        collection.append(card);
    });

    statusBox.classList.remove("status--loading", "status--error");
    statusBox.classList.add("status--success");

    statusTitle.textContent = "Готово";
    statusText.textContent = `Загружено игр: ${games.length}`;
}

reloadButton.addEventListener("click", () => {
    loadGames();
});

sortSelect.addEventListener("change", () => {
    loadGames();
});

entryForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(entryForm);

    const newGame = {
        title: formData.get("title"),
        genre: formData.get("genre"),
        platform: formData.get("platform"),
        releaseYear: Number(formData.get("releaseYear")),
        rating: Number(formData.get("rating")),
    };
    formStatus.textContent = "";

    submitButton.disabled = true;
    submitButton.textContent = "Отправляем...";

    try {
        await createGame(newGame);
        entryForm.reset();
        formStatus.textContent = "Игра успешно добавлена ура";
        await loadGames();
    } catch (error) {
        console.error("Не удалось добавить игру:", error);
        formStatus.textContent = "Не удалось добавить игру";
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Отправить в API";
    }
});

loadGames();

async function createGame(newGame) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(newGame),
    });

    if (!response.ok) {
        throw new Error(`Ошибка HTTP: ${response.status}`);
    }

    const createdGame = await response.json();

    return createdGame;
}

async function deleteGame(gameId) {
    const response = await fetch(`${API_URL}/${gameId}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        throw new Error(`Ошибка HTTP: ${response.status}`);
    }
}
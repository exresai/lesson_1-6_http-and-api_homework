// Стартовая точка домашней работы.
// Спроектируйте модель ресурса, запросы и состояния самостоятельно.

"use strict";

const API_URL = "http://localhost:3000/games";

const statusBox = document.querySelector('[data-ui="status"]');
const collection = document.querySelector('[data-ui="collection"]');
const statusTitle = document.querySelector(".status__title");
const statusText = document.querySelector(".status__text");

const reloadButton = document.querySelector('[data-action="reload"]');
const entryForm = document.querySelector('[data-form="entry"]');
const submitButton = document.querySelector('[data-action="submit"]');

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

async function loadGames() {
    showLoadingState();

    try {
        const response = await fetch(API_URL, {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }

        const games = await response.json();

        renderGames(games);
    } catch (error) {
        console.error("Не удалось загрузить игры:", error);
        showErrorState();
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
        card.append(title, meta);
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

entryForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(entryForm);

    const newGame = {
        title: formData.get("title"),
        genre: formData.get("genre"),
        platform: formData.get("platform"),
        releaseYear: Number(formData.get("releaseYear")),
        rating: Number(formData.get("rating")),
    };

    console.log(newGame);
});

loadGames();
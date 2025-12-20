// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBzQ4QeB6gI4q8w4Q9bQ8W7r6JkLmNpOqRs",
    projectId: "aemafia-game",
    databaseURL: "https://aemafia-8e83b-default-rtdb.europe-west1.firebasedatabase.app",
    appId: "1:123456789012:web:abcdef123456"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Переменные игры
let playerId = null;
let playerName = '';
let gameState = {};
let playerRole = '';
let gameInterval = null;
let timeLeft = 60;
let currentPhase = 'day';
let dayNumber = 1;
let isGameActive = false;

// Элементы DOM
const lobbyScreen = document.getElementById('lobby');
const gameScreen = document.getElementById('gameScreen');
const playerNameInput = document.getElementById('playerName');
const joinGameBtn = document.getElementById('joinGame');
const startGameBtn = document.getElementById('startGame');
const leaveLobbyBtn = document.getElementById('leaveLobby');
const playersList = document.getElementById('playersList');
const playerCount = document.getElementById('playerCount');
const gamePlayers = document.getElementById('gamePlayers');
const aliveCount = document.getElementById('aliveCount');
const gamePhase = document.getElementById('gamePhase');
const gameTimer = document.getElementById('gameTimer');
const phaseTitle = document.getElementById('phaseTitle');
const phaseDescription = document.getElementById('phaseDescription');
const playerRoleElement = document.getElementById('playerRole');
const roleDescription = document.getElementById('roleDescription');
const playerStatus = document.getElementById('playerStatus');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMessageBtn = document.getElementById('sendMessage');
const voteButton = document.getElementById('voteButton');
const nightActionButton = document.getElementById('nightAction');
const leaveGameBtn = document.getElementById('leaveGame');
const voteModal = document.getElementById('voteModal');
const nightModal = document.getElementById('nightModal');
const voteOptions = document.getElementById('voteOptions');
const nightOptions = document.getElementById('nightOptions');
const cancelVote = document.getElementById('cancelVote');
const cancelNightAction = document.getElementById('cancelNightAction');

// Генерация уникального ID игрока
function generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Присоединение к лобби
joinGameBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (!name) {
        alert('Пожалуйста, введите ваше имя');
        return;
    }
    
    playerName = name;
    playerId = generatePlayerId();
    
    // Сохраняем игрока в Firebase
    database.ref(`lobby/${playerId}`).set({
        name: playerName,
        ready: false,
        joinedAt: Date.now(),
        isHost: false // Позже определим, кто хост
    });
    
    // Переключаемся на лобби
    switchToLobby();
    
    // Загружаем список игроков
    loadLobbyPlayers();
});

// Переключение на лобби
function switchToLobby() {
    lobbyScreen.classList.add('active');
    gameScreen.classList.remove('active');
    isGameActive = false;
    
    // Сбрасываем состояние игры
    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }
}

// Переключение на игру
function switchToGame() {
    lobbyScreen.classList.remove('active');
    gameScreen.classList.add('active');
    isGameActive = true;
}

// Загрузка игроков в лобби
function loadLobbyPlayers() {
    database.ref('lobby').on('value', (snapshot) => {
        const players = snapshot.val() || {};
        const playerIds = Object.keys(players);
        
        playerCount.textContent = playerIds.length;
        
        // Обновляем список игроков
        playersList.innerHTML = '';
        
        if (playerIds.length === 0) {
            playersList.innerHTML = '<p class="empty">Игроков пока нет. Будьте первым!</p>';
            startGameBtn.disabled = true;
            startGameBtn.innerHTML = '<i class="fas fa-play"></i> Начать игру (минимум 4 игрока)';
            return;
        }
        
        // Определяем, кто первый игрок (хост)
        let isFirstPlayer = true;
        let hasHost = false;
        
        playerIds.forEach(id => {
            const player = players[id];
            
            // Проверяем, есть ли уже хост
            if (player.isHost) {
                hasHost = true;
            }
        });
        
        // Если нет хоста, делаем первого игрока хостом
        if (!hasHost && playerIds.length > 0) {
            const firstPlayerId = playerIds[0];
            database.ref(`lobby/${firstPlayerId}/isHost`).set(true);
            hasHost = true;
        }
        
        // Обновляем кнопку для хоста
        const isThisPlayerHost = players[playerId]?.isHost;
        startGameBtn.style.display = isThisPlayerHost ? 'flex' : 'none';
        
        // Проверяем возможность начала игры
        const canStart = playerIds.length >= 4;
        startGameBtn.disabled = !canStart;
        
        if (canStart) {
            startGameBtn.innerHTML = `<i class="fas fa-play"></i> Начать игру (${playerIds.length}/4+)`;
        } else {
            startGameBtn.innerHTML = `<i class="fas fa-play"></i> Начать игру (нужно ещё ${4 - playerIds.length} игроков)`;
        }
        
        // Отображаем игроков
        playerIds.forEach(id => {
            const player = players[id];
            const playerElement = document.createElement('div');
            playerElement.className = 'player-item';
            
            let hostBadge = '';
            if (player.isHost) {
                hostBadge = '<span class="host-badge" title="Хост игры"><i class="fas fa-crown"></i></span>';
            }
            
            playerElement.innerHTML = `
                <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
                <div class="player-name">${player.name} ${hostBadge}</div>
                <div class="player-status">${player.ready ? '✅' : '⏳'}</div>
            `;
            playersList.appendChild(playerElement);
        });
        
        isFirstPlayer = false;
    });
    
    // Слушаем изменения состояния игры
    database.ref('gameState').on('value', (snapshot) => {
        const gameData = snapshot.val();
        if (gameData && gameData.status === 'active' && !isGameActive) {
            // Игра началась, переключаем всех игроков
            joinExistingGame();
        }
    });
}

// Начало игры (только для хоста)
startGameBtn.addEventListener('click', () => {
    database.ref('lobby').once('value', (snapshot) => {
        const players = snapshot.val() || {};
        const playerIds = Object.keys(players);
        
        if (playerIds.length < 4) {
            alert('Для начала игры нужно минимум 4 игрока!');
            return;
        }
        
        // Проверяем, что текущий игрок - хост
        if (!players[playerId]?.isHost) {
            alert('Только хост может начать игру!');
            return;
        }
        
        // Блокируем кнопку начала игры
        startGameBtn.disabled = true;
        startGameBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Начинаем игру...';
        
        // Инициализируем игру
        initializeGame(playerIds, players);
    });
});

// Присоединение к существующей игре
function joinExistingGame() {
    database.ref('gameState').once('value', (snapshot) => {
        const gameData = snapshot.val();
        if (!gameData || gameData.status !== 'active') return;
        
        // Получаем состояние игры
        database.ref('game').once('value', (gameSnapshot) => {
            const existingGame = gameSnapshot.val();
            if (!existingGame) return;
            
            // Проверяем, есть ли текущий игрок в игре
            if (existingGame.players && existingGame.players[playerId]) {
                // Игрок уже в игре
                gameState = existingGame;
                playerRole = existingGame.players[playerId].role;
                
                // Переключаемся на игровой экран
                switchToGame();
                startGameLoop();
                
                // Отправляем сообщение о присоединении
                addSystemMessage(`${playerName} присоединился к игре!`);
            } else {
                // Игрока нет в игре, возможно, игра уже началась
                alert('Игра уже началась. Дождитесь окончания текущей игры.');
            }
        });
    });
}

// Инициализация новой игры
function initializeGame(playerIds, players) {
    // Определяем роли
    const roles = assignRoles(playerIds.length);
    
    // Создаем начальное состояние игры
    const initialGameState = {
        phase: 'night',
        day: 1,
        timer: 60,
        players: {},
        votes: {},
        nightActions: {},
        status: 'active'
    };
    
    // Создаем игроков в состоянии игры
    playerIds.forEach((id, index) => {
        initialGameState.players[id] = {
            name: players[id].name,
            role: roles[index],
            alive: true,
            voted: false,
            votesReceived: 0
        };
    });
    
    // Сохраняем состояние игры
    database.ref('game').set(initialGameState)
        .then(() => {
            // Сохраняем метаданные игры
            return database.ref('gameState').set({
                status: 'active',
                startedAt: Date.now(),
                host: playerId,
                playerCount: playerIds.length
            });
        })
        .then(() => {
            // Оповещаем всех игроков о начале игры
            return database.ref('gameNotifications').set({
                type: 'game_started',
                timestamp: Date.now(),
                message: 'Игра началась!'
            });
        })
        .then(() => {
            // Устанавливаем роль текущему игроку
            playerRole = roles[playerIds.indexOf(playerId)];
            updatePlayerRole();
            
            // Переключаемся на игровой экран
            switchToGame();
            
            // Начинаем игровой цикл
            startGameLoop();
            
            // Отправляем системное сообщение
            addSystemMessage('Игра началась! Ночь 1. Мафия, проснитесь!');
            
            // Очищаем лобби
            database.ref('lobby').remove();
        })
        .catch((error) => {
            console.error('Ошибка при запуске игры:', error);
            alert('Ошибка при запуске игры. Пожалуйста, попробуйте снова.');
            startGameBtn.disabled = false;
            startGameBtn.innerHTML = '<i class="fas fa-play"></i> Начать игру';
        });
}

// Слушаем уведомления о начале игры
database.ref('gameNotifications').on('value', (snapshot) => {
    const notification = snapshot.val();
    if (notification && notification.type === 'game_started' && !isGameActive) {
        // Задержка для синхронизации
        setTimeout(() => {
            joinExistingGame();
        }, 1000);
    }
});

// Распределение ролей
function assignRoles(playerCount) {
    const mafiaCount = Math.max(1, Math.floor(playerCount / 4));
    const civilianCount = playerCount - mafiaCount;
    
    const roles = [];
    
    // Добавляем мафию
    for (let i = 0; i < mafiaCount; i++) {
        roles.push('mafia');
    }
    
    // Добавляем мирных жителей
    for (let i = 0; i < civilianCount; i++) {
        roles.push('civilian');
    }
    
    // Перемешиваем роли
    return shuffleArray(roles);
}

// Перемешивание массива
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Обновление роли игрока
function updatePlayerRole() {
    playerRoleElement.textContent = getRoleName(playerRole);
    roleDescription.textContent = getRoleDescription(playerRole);
}

// Получение названия роли
function getRoleName(role) {
    const roles = {
        'civilian': 'Мирный житель',
        'mafia': 'Мафия',
        'sheriff': 'Шериф',
        'doctor': 'Доктор'
    };
    return roles[role] || role;
}

// Получение описания роли
function getRoleDescription(role) {
    const descriptions = {
        'civilian': 'Ваша цель - найти и устранить всех мафиози. Вы можете обсуждать и голосовать днём.',
        'mafia': 'Вы член мафии. Ночью вы можете выбрать жертву для устранения. Днём притворяйтесь мирным жителем.',
        'sheriff': 'Вы шериф. Ночью вы можете проверить одного игрока на принадлежность к мафии.',
        'doctor': 'Вы доктор. Ночью вы можете вылечить одного игрока, защитив его от убийства.'
    };
    return descriptions[role] || 'Роль не определена';
}

// Игровой цикл
function startGameLoop() {
    // Слушаем изменения состояния игры
    database.ref('game').on('value', (snapshot) => {
        const newGameState = snapshot.val();
        if (!newGameState) return;
        
        gameState = newGameState;
        currentPhase = gameState.phase;
        dayNumber = gameState.day;
        timeLeft = gameState.timer;
        
        updateGameUI();
        updatePlayersList();
        checkGameEnd();
    });
    
    // Запускаем таймер
    if (gameInterval) clearInterval(gameInterval);
    
    gameInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimer();
            
            // Обновляем таймер в Firebase только если мы хост
            database.ref('lobby').once('value', (snapshot) => {
                const players = snapshot.val() || {};
                if (players[playerId]?.isHost) {
                    database.ref('game/timer').set(timeLeft);
                }
            });
        } else {
            // Время фазы истекло
            endPhase();
        }
    }, 1000);
}

// Обновление UI игры
function updateGameUI() {
    // Обновляем фазу и день
    gamePhase.textContent = `${currentPhase === 'day' ? 'День' : 'Ночь'} ${dayNumber}`;
    phaseTitle.textContent = currentPhase === 'day' ? 'Дневное обсуждение' : 'Ночь';
    
    // Обновляем описание фазы
    if (currentPhase === 'day') {
        phaseDescription.textContent = 'Обсудите, кто может быть мафией и проголосуйте за подозрительного игрока.';
        voteButton.disabled = !gameState.players[playerId]?.alive || gameState.players[playerId]?.voted;
        nightActionButton.disabled = true;
    } else {
        phaseDescription.textContent = 'Ночь. Мафия выбирает жертву. Мирные жители спят.';
        voteButton.disabled = true;
        
        // Активируем ночное действие для мафии
        if (playerRole === 'mafia' && gameState.players[playerId]?.alive) {
            nightActionButton.disabled = false;
        }
    }
    
    // Включаем чат во время дня
    chatInput.disabled = currentPhase !== 'day' || !gameState.players[playerId]?.alive;
    sendMessageBtn.disabled = chatInput.disabled;
    
    // Обновляем статус игрока
    if (gameState.players[playerId]) {
        const isAlive = gameState.players[playerId].alive;
        playerStatus.textContent = isAlive ? 'Жив' : 'Мёртв';
        playerStatus.className = isAlive ? 'status-alive' : 'status-dead';
    }
}

// Обновление таймера
function updateTimer() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    gameTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Обновление списка игроков
function updatePlayersList() {
    const players = gameState.players || {};
    const alivePlayers = Object.values(players).filter(p => p.alive);
    
    aliveCount.textContent = alivePlayers.length;
    gamePlayers.innerHTML = '';
    
    Object.entries(players).forEach(([id, player]) => {
        const playerElement = document.createElement('div');
        playerElement.className = `game-player ${!player.alive ? 'dead' : ''} ${player.voted ? 'voted' : ''}`;
        
        // Показываем роль только если игрок мёртв или это сам игрок
        const showRole = !player.alive || id === playerId;
        
        playerElement.innerHTML = `
            <div class="player-avatar-large">${player.name.charAt(0).toUpperCase()}</div>
            <div class="player-name">${player.name}</div>
            ${showRole ? `<div class="player-role">${getRoleName(player.role)}</div>` : ''}
            ${player.voted ? '<div class="vote-indicator">✓</div>' : ''}
            <div class="player-status">${player.alive ? '❤️' : '💀'}</div>
        `;
        
        gamePlayers.appendChild(playerElement);
    });
}

// Завершение фазы
function endPhase() {
    // Проверяем, хост ли текущий игрок
    database.ref('lobby').once('value', (snapshot) => {
        const players = snapshot.val() || {};
        if (!players[playerId]?.isHost) return;
        
        if (currentPhase === 'day') {
            // Подсчитываем голоса
            const votes = gameState.votes || {};
            const voteCount = {};
            
            Object.values(votes).forEach(targetId => {
                voteCount[targetId] = (voteCount[targetId] || 0) + 1;
            });
            
            // Находим игрока с наибольшим количеством голосов
            let maxVotes = 0;
            let eliminatedPlayerId = null;
            
            Object.entries(voteCount).forEach(([pid, votes]) => {
                if (votes > maxVotes) {
                    maxVotes = votes;
                    eliminatedPlayerId = pid;
                }
            });
            
            // Устраняем игрока
            if (eliminatedPlayerId) {
                database.ref(`game/players/${eliminatedPlayerId}/alive`).set(false);
                addSystemMessage(`${gameState.players[eliminatedPlayerId].name} был изгнан городом!`);
            }
            
            // Переходим к ночи
            database.ref('game').update({
                phase: 'night',
                day: dayNumber + 1,
                timer: 60,
                votes: {}
            });
            
            // Сбрасываем голоса игроков
            Object.keys(gameState.players).forEach(id => {
                database.ref(`game/players/${id}/voted`).set(false);
                database.ref(`game/players/${id}/votesReceived`).set(0);
            });
            
        } else {
            // Обрабатываем ночные действия
            const nightActions = gameState.nightActions || {};
            
            if (nightActions.mafia) {
                const targetId = nightActions.mafia;
                database.ref(`game/players/${targetId}/alive`).set(false);
                addSystemMessage(`${gameState.players[targetId].name} был убит мафией ночью!`);
            }
            
            // Переходим ко дню
            database.ref('game').update({
                phase: 'day',
                timer: 120,
                nightActions: {}
            });
        }
    });
}

// Голосование
voteButton.addEventListener('click', () => {
    if (!gameState.players[playerId]?.alive) return;
    
    // Показываем модальное окно голосования
    showVoteModal();
});

// Показ модального окна голосования
function showVoteModal() {
    voteOptions.innerHTML = '';
    
    Object.entries(gameState.players).forEach(([id, player]) => {
        if (id !== playerId && player.alive) {
            const option = document.createElement('div');
            option.className = 'vote-option';
            option.innerHTML = `
                <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
                <div class="player-name">${player.name}</div>
            `;
            option.addEventListener('click', () => castVote(id));
            voteOptions.appendChild(option);
        }
    });
    
    voteModal.classList.add('active');
}

// Отмена голосования
cancelVote.addEventListener('click', () => {
    voteModal.classList.remove('active');
});

// Голосование за игрока
function castVote(targetId) {
    database.ref(`game/votes/${playerId}`).set(targetId);
    database.ref(`game/players/${playerId}/voted`).set(true);
    
    // Увеличиваем счетчик голосов для цели
    const currentVotes = gameState.players[targetId]?.votesReceived || 0;
    database.ref(`game/players/${targetId}/votesReceived`).set(currentVotes + 1);
    
    voteModal.classList.remove('active');
    addSystemMessage(`Вы проголосовали за ${gameState.players[targetId].name}`);
}

// Ночное действие
nightActionButton.addEventListener('click', () => {
    if (playerRole !== 'mafia' || currentPhase !== 'night') return;
    
    showNightModal();
});

// Показ модального окна ночного действия
function showNightModal() {
    nightOptions.innerHTML = '';
    
    Object.entries(gameState.players).forEach(([id, player]) => {
        if (id !== playerId && player.alive && player.role !== 'mafia') {
            const option = document.createElement('div');
            option.className = 'vote-option';
            option.innerHTML = `
                <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
                <div class="player-name">${player.name}</div>
            `;
            option.addEventListener('click', () => performNightAction(id));
            nightOptions.appendChild(option);
        }
    });
    
    nightModal.classList.add('active');
}

// Отмена ночного действия
cancelNightAction.addEventListener('click', () => {
    nightModal.classList.remove('active');
});

// Выполнение ночного действия
function performNightAction(targetId) {
    database.ref(`game/nightActions/mafia`).set(targetId);
    nightModal.classList.remove('active');
    addSystemMessage(`Вы выбрали цель для ночного действия: ${gameState.players[targetId].name}`);
}

// Отправка сообщения в чат
sendMessageBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Сохраняем сообщение в Firebase
    const messageId = 'msg_' + Date.now();
    database.ref(`chat/${messageId}`).set({
        playerId: playerId,
        playerName: playerName,
        message: message,
        timestamp: Date.now(),
        phase: currentPhase,
        day: dayNumber
    });
    
    chatInput.value = '';
}

// Загрузка чата
database.ref('chat').limitToLast(20).on('child_added', (snapshot) => {
    const message = snapshot.val();
    addChatMessage(message);
});

// Добавление сообщения в чат
function addChatMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message player';
    
    const time = new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    messageElement.innerHTML = `
        <strong>${message.playerName}:</strong> ${message.message}
        <div class="message-time">${time}</div>
    `;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Добавление системного сообщения
function addSystemMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message system';
    messageElement.innerHTML = `<strong>Система:</strong> ${text}`;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Проверка окончания игры
function checkGameEnd() {
    const players = gameState.players || {};
    const alivePlayers = Object.values(players).filter(p => p.alive);
    const aliveMafia = alivePlayers.filter(p => p.role === 'mafia');
    const aliveCivilians = alivePlayers.filter(p => p.role !== 'mafia');
    
    if (aliveMafia.length === 0) {
        endGame('Мирные жители победили! Вся мафия устранена!');
    } else if (aliveMafia.length >= aliveCivilians.length) {
        endGame('Мафия победила! Они захватили город!');
    }
}

// Завершение игры
function endGame(message) {
    clearInterval(gameInterval);
    addSystemMessage(`🎉 ${message} 🎉`);
    
    // Отключаем все кнопки
    voteButton.disabled = true;
    nightActionButton.disabled = true;
    chatInput.disabled = true;
    sendMessageBtn.disabled = true;
    
    // Показываем все роли
    updatePlayersList();
    
    // Оповещаем об окончании игры
    database.ref('gameNotifications').set({
        type: 'game_ended',
        timestamp: Date.now(),
        message: message
    });
    
    // Очищаем состояние игры через 30 секунд
    setTimeout(() => {
        database.ref('game').remove();
        database.ref('gameState').remove();
        database.ref('chat').remove();
        
        // Возвращаем всех в лобби
        switchToLobby();
        playerRole = '';
        updatePlayerRole();
    }, 30000);
}

// Слушаем уведомления об окончании игры
database.ref('gameNotifications').on('value', (snapshot) => {
    const notification = snapshot.val();
    if (notification && notification.type === 'game_ended') {
        setTimeout(() => {
            if (isGameActive) {
                endGame(notification.message);
            }
        }, 1000);
    }
});

// Покидание лобби
leaveLobbyBtn.addEventListener('click', () => {
    if (playerId) {
        database.ref(`lobby/${playerId}`).remove();
    }
    playerId = null;
    playerName = '';
    playerNameInput.value = '';
    switchToLobby();
});

// Покидание игры
leaveGameBtn.addEventListener('click', () => {
    if (confirm('Вы уверены, что хотите покинуть игру?')) {
        if (gameState.players && playerId) {
            // Помечаем игрока как мёртвого
            database.ref(`game/players/${playerId}/alive`).set(false);
        }
        
        // Очищаем состояние
        clearInterval(gameInterval);
        
        // Возвращаемся в лобби
        switchToLobby();
        playerRole = '';
        updatePlayerRole();
    }
});

// Инициализация при загрузке
window.addEventListener('load', () => {
    // Проверяем, есть ли активная игра
    database.ref('gameState').once('value', (snapshot) => {
        const gameData = snapshot.val();
        
        if (gameData && gameData.status === 'active') {
            // Присоединяемся к существующей игре
            setTimeout(() => {
                joinExistingGame();
            }, 500);
        } else {
            // Показываем лобби
            switchToLobby();
            loadLobbyPlayers();
        }
    });
});

// Предотвращение закрытия страницы
window.addEventListener('beforeunload', (e) => {
    if (playerId) {
        // Удаляем игрока при закрытии страницы
        database.ref(`lobby/${playerId}`).remove();
        if (gameState.players && gameState.players[playerId]) {
            database.ref(`game/players/${playerId}/alive`).set(false);
        }
    }
});

// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCVt_GKrelvuOjvUqaP_PX7xksDib1yxIY",
    authDomain: "aemafia-8e83b.firebaseapp.com",
    projectId: "aemafia-8e83b",
    storageBucket: "aemafia-8e83b.firebasestorage.app",
    messagingSenderId: "572883486618",
    appId: "1:572883486618:web:f4ded30fa8d55111245c23",
    measurementId: "G-RM8NNZSZH4",
    databaseURL: "https://aemafia-8e83b-default-rtdb.europe-west1.firebasedatabase.app"
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
let isJoined = false; // Флаг присоединения к лобби

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

// Обновляем интерфейс кнопок
function updateButtons() {
    if (isJoined) {
        joinGameBtn.disabled = true;
        joinGameBtn.innerHTML = '<i class="fas fa-check"></i> Вы уже в лобби';
        joinGameBtn.classList.add('btn-success');
        joinGameBtn.classList.remove('btn-primary');
        leaveLobbyBtn.disabled = false;
    } else {
        joinGameBtn.disabled = false;
        joinGameBtn.innerHTML = '<i class="fas fa-gamepad"></i> Присоединиться к игре';
        joinGameBtn.classList.remove('btn-success');
        joinGameBtn.classList.add('btn-primary');
        leaveLobbyBtn.disabled = true;
    }
}

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
    
    // Проверяем, не присоединился ли уже игрок
    if (isJoined) {
        alert('Вы уже присоединились к игре!');
        return;
    }
    
    playerName = name;
    playerId = generatePlayerId();
    isJoined = true;
    
    // Обновляем интерфейс
    updateButtons();
    
    // Сохраняем имя в localStorage
    localStorage.setItem('aemafia_playerName', name);
    localStorage.setItem('aemafia_playerId', playerId);
    
    // Проверяем подключение к базе данных
    checkDatabaseConnection();
    
    // Сохраняем игрока в Firebase
    database.ref(`lobby/${playerId}`).set({
        name: playerName,
        ready: false,
        joinedAt: Date.now(),
        isActive: true
    })
    .then(() => {
        console.log('Игрок успешно добавлен в лобби');
        
        // Переключаемся на лобби
        switchToLobby();
        
        // Загружаем список игроков
        loadLobbyPlayers();
        
        // Включаем кнопку начала игры для первого игрока
        checkGameStartButton();
    })
    .catch((error) => {
        console.error('Ошибка при добавлении игрока:', error);
        alert('Ошибка подключения к серверу. Проверьте соединение с интернетом.');
        isJoined = false;
        updateButtons();
    });
});

// Проверка подключения к базе данных
function checkDatabaseConnection() {
    const testRef = database.ref('.info/connected');
    testRef.on('value', (snapshot) => {
        const connected = snapshot.val();
        console.log('Подключение к Firebase:', connected ? 'есть' : 'нет');
    });
}

// Переключение на лобби
function switchToLobby() {
    lobbyScreen.classList.add('active');
    gameScreen.classList.remove('active');
}

// Переключение на игру
function switchToGame() {
    lobbyScreen.classList.remove('active');
    gameScreen.classList.add('active');
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
            return;
        }
        
        playerIds.forEach(id => {
            const player = players[id];
            const playerElement = document.createElement('div');
            playerElement.className = 'player-item';
            
            // Помечаем текущего игрока
            const isCurrentPlayer = id === playerId;
            
            playerElement.innerHTML = `
                <div class="player-avatar" style="${isCurrentPlayer ? 'background: linear-gradient(135deg, #00b894, #00adb5);' : ''}">
                    ${player.name.charAt(0).toUpperCase()}
                    ${isCurrentPlayer ? '<div class="you-badge">Вы</div>' : ''}
                </div>
                <div class="player-name">${player.name}</div>
            `;
            playersList.appendChild(playerElement);
        });
        
        // Проверяем возможность начала игры
        checkGameStartButton();
    });
}

// Проверка кнопки начала игры
function checkGameStartButton() {
    database.ref('lobby').once('value', (snapshot) => {
        const players = snapshot.val() || {};
        const playerIds = Object.keys(players);
        
        // Активируем кнопку если минимум 4 игрока
        startGameBtn.disabled = playerIds.length < 4;
        startGameBtn.innerHTML = playerIds.length < 4 
            ? `<i class="fas fa-play"></i> Начать игру (нужно ещё ${4 - playerIds.length} игроков)` 
            : '<i class="fas fa-play"></i> Начать игру';
    });
}

// Начало игры
startGameBtn.addEventListener('click', () => {
    if (!isJoined) {
        alert('Вы не присоединены к лобби!');
        return;
    }
    
    database.ref('lobby').once('value', (snapshot) => {
        const players = snapshot.val() || {};
        const playerIds = Object.keys(players);
        
        if (playerIds.length < 4) {
            alert('Для начала игры нужно минимум 4 игрока!');
            return;
        }
        
        // Инициализируем состояние игры
        initializeGame(playerIds, players);
    });
});

// Инициализация игры
function initializeGame(playerIds, players) {
    // Определяем роли
    const roles = assignRoles(playerIds.length);
    
    // Создаем состояние игры
    gameState = {
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
        gameState.players[id] = {
            name: players[id].name,
            role: roles[index],
            alive: true,
            voted: false,
            votesReceived: 0
        };
        
        // Устанавливаем роль текущему игроку
        if (id === playerId) {
            playerRole = roles[index];
            updatePlayerRole();
        }
    });
    
    // Сохраняем состояние игры в Firebase
    database.ref('game').set(gameState)
    .then(() => {
        console.log('Игра успешно инициализирована');
        
        // Удаляем лобби
        database.ref('lobby').remove();
        
        // Переключаемся на игровой экран
        switchToGame();
        
        // Начинаем игровой цикл
        startGameLoop();
        
        // Отправляем системное сообщение
        addSystemMessage('Игра началась! Ночь 1. Мафия, проснитесь!');
    })
    .catch((error) => {
        console.error('Ошибка при инициализации игры:', error);
        alert('Ошибка при создании игры. Попробуйте еще раз.');
    });
}

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
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Обновление роли игрока
function updatePlayerRole() {
    playerRoleElement.textContent = getRoleName(playerRole);
    roleDescription.textContent = getRoleDescription(playerRole);
    
    // Обновляем доступность кнопок в зависимости от роли
    if (playerRole === 'mafia' && currentPhase === 'night') {
        nightActionButton.disabled = false;
    } else {
        nightActionButton.disabled = true;
    }
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
        if (!newGameState) {
            // Игра закончилась или была удалена
            console.log('Игра завершена, возвращаемся в лобби');
            switchToLobby();
            isJoined = false;
            updateButtons();
            clearInterval(gameInterval);
            return;
        }
        
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
            
            // Обновляем таймер в Firebase
            database.ref('game/timer').set(timeLeft);
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
    if (gameState.players && gameState.players[playerId]) {
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
        const isCurrentPlayer = id === playerId;
        
        playerElement.innerHTML = `
            <div class="player-avatar-large" style="${isCurrentPlayer ? 'background: linear-gradient(135deg, #00b894, #00adb5);' : ''}">
                ${player.name.charAt(0).toUpperCase()}
                ${isCurrentPlayer ? '<div class="you-badge">Вы</div>' : ''}
            </div>
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
        
        Object.entries(voteCount).forEach(([playerId, votes]) => {
            if (votes > maxVotes) {
                maxVotes = votes;
                eliminatedPlayerId = playerId;
            }
        });
        
        // Устраняем игрока
        if (eliminatedPlayerId) {
            database.ref(`game/players/${eliminatedPlayerId}/alive`).set(false)
            .then(() => {
                addSystemMessage(`${gameState.players[eliminatedPlayerId].name} был изгнан городом!`);
            });
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
            database.ref(`game/players/${targetId}/alive`).set(false)
            .then(() => {
                addSystemMessage(`${gameState.players[targetId].name} был убит мафией ночью!`);
            });
        }
        
        // Переходим ко дню
        database.ref('game').update({
            phase: 'day',
            timer: 120,
            nightActions: {}
        });
    }
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
    })
    .then(() => {
        chatInput.value = '';
    })
    .catch((error) => {
        console.error('Ошибка при отправке сообщения:', error);
    });
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
    
    // Ограничиваем количество сообщений
    const messages = chatMessages.querySelectorAll('.message');
    if (messages.length > 50) {
        messages[0].remove();
    }
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
    
    // Очищаем состояние игры через 30 секунд
    setTimeout(() => {
        database.ref('game').remove();
        database.ref('chat').remove();
        switchToLobby();
        playerRole = '';
        updatePlayerRole();
        isJoined = false;
        updateButtons();
    }, 30000);
}

// Покидание лобби
leaveLobbyBtn.addEventListener('click', () => {
    if (playerId && isJoined) {
        database.ref(`lobby/${playerId}`).remove()
        .then(() => {
            playerId = null;
            playerName = '';
            isJoined = false;
            playerNameInput.value = '';
            updateButtons();
            localStorage.removeItem('aemafia_playerId');
        });
    }
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
        database.ref('game').remove();
        database.ref('chat').remove();
        
        // Возвращаемся в лобби
        switchToLobby();
        playerRole = '';
        updatePlayerRole();
        isJoined = false;
        updateButtons();
    }
});

// Инициализация при загрузке
window.addEventListener('load', () => {
    // Восстанавливаем данные из localStorage
    const savedName = localStorage.getItem('aemafia_playerName');
    const savedPlayerId = localStorage.getItem('aemafia_playerId');
    
    if (savedName) {
        playerNameInput.value = savedName;
        playerName = savedName;
    }
    
    // Обновляем кнопки
    updateButtons();
    
    // Проверяем, есть ли активная игра
    database.ref('game').once('value', (snapshot) => {
        if (snapshot.exists()) {
            // Если есть активная игра, присоединяемся к ней
            gameState = snapshot.val();
            
            // Находим свою роль по сохраненному ID
            if (gameState.players && savedPlayerId && gameState.players[savedPlayerId]) {
                playerId = savedPlayerId;
                playerRole = gameState.players[savedPlayerId].role;
                console.log(`Восстановлена роль: ${playerRole} для игрока ${playerName}`);
                
                isJoined = true;
                updateButtons();
                switchToGame();
                startGameLoop();
                return;
            }
            
            // Если не нашли по ID, ищем по имени
            if (gameState.players && playerName) {
                Object.entries(gameState.players).forEach(([id, player]) => {
                    if (player.name === playerName) {
                        playerId = id;
                        playerRole = player.role;
                        console.log(`Восстановлена роль по имени: ${playerRole} для игрока ${playerName}`);
                        
                        isJoined = true;
                        updateButtons();
                        switchToGame();
                        startGameLoop();
                    }
                });
            }
        }
        
        // Проверяем, есть ли лобби и наш игрок в нем
        if (savedPlayerId) {
            database.ref(`lobby/${savedPlayerId}`).once('value', (snapshot) => {
                if (snapshot.exists()) {
                    const playerData = snapshot.val();
                    if (playerData && playerData.isActive) {
                        playerId = savedPlayerId;
                        isJoined = true;
                        updateButtons();
                        console.log('Восстановлено присоединение к лобби');
                    }
                }
                
                // В любом случае показываем лобби
                switchToLobby();
                loadLobbyPlayers();
            });
        } else {
            // Иначе показываем лобби
            switchToLobby();
            loadLobbyPlayers();
        }
    })
    .catch((error) => {
        console.error('Ошибка при проверке активной игры:', error);
        switchToLobby();
        loadLobbyPlayers();
    });
});

// Предотвращение закрытия страницы
window.addEventListener('beforeunload', (e) => {
    if (playerId && database && isJoined) {
        // Удаляем игрока при закрытии страницы
        database.ref(`lobby/${playerId}`).remove();
        if (gameState.players && gameState.players[playerId]) {
            database.ref(`game/players/${playerId}/alive`).set(false);
        }
    }
});

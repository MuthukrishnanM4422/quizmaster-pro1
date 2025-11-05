let playerId = null;
let currentGamePin = null;
let playerInterval = null;

// Join a game
function joinGame() {
    const gamePin = document.getElementById('game-pin').value;
    const playerName = document.getElementById('player-name').value;
    
    if (!gamePin || !playerName) {
        alert('Please enter both game PIN and your name');
        return;
    }
    
    // Check if game exists
    const games = getGames();
    if (!games[gamePin]) {
        alert('Invalid game PIN. Please check and try again.');
        return;
    }
    
    // Generate player ID
    playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    currentGamePin = gamePin;
    
    // Add player to game
    const game = games[gamePin];
    game.players[playerId] = {
        name: playerName,
        score: 0,
        connected: true,
        joinedAt: new Date().toISOString(),
        answers: {}
    };
    
    // Save to localStorage
    games[gamePin] = game;
    localStorage.setItem('kahootGames', JSON.stringify(games));
    
    // Show waiting screen
    showScreen('waiting-screen');
    document.getElementById('player-display-name').textContent = playerName;
    document.getElementById('display-game-pin').textContent = gamePin;
    
    // Start monitoring game state
    startGameMonitoring();
    
    updateLobbyPlayers();
}

// Show specific screen
function showScreen(screenId) {
    document.getElementById('join-screen').classList.add('hidden');
    document.getElementById('waiting-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('results-screen').classList.add('hidden');
    document.getElementById('live-leaderboard-panel').classList.add('hidden');
    
    document.getElementById(screenId).classList.remove('hidden');
    
    if (screenId === 'game-screen') {
        document.getElementById('live-leaderboard-panel').classList.remove('hidden');
    }
}

// Update lobby players list
function updateLobbyPlayers() {
    const game = getCurrentGame();
    if (!game) return;
    
    const playersList = document.getElementById('lobby-players');
    playersList.innerHTML = Object.values(game.players).map(player => `
        <div class="player-card">
            ${player.name}
        </div>
    `).join('');
}

// Start monitoring game state
function startGameMonitoring() {
    playerInterval = setInterval(() => {
        const game = getCurrentGame();
        if (!game) {
            // Game might have been deleted
            alert('Game no longer exists');
            leaveGame();
            return;
        }
        
        updateGameState(game);
    }, 1000);
}

// Update game state based on current game status
function updateGameState(game) {
    switch(game.status) {
        case 'waiting':
            updateLobbyPlayers();
            break;
            
        case 'playing':
            showScreen('game-screen');
            showCurrentQuestion(game);
            updateLeaderboard();
            break;
            
        case 'finished':
            showScreen('results-screen');
            showFinalResults(game);
            clearInterval(playerInterval);
            break;
    }
}

// Show current question
function showCurrentQuestion(game) {
    const question = game.questions[game.currentQuestion];
    if (!question) return;
    
    document.getElementById('q-number').textContent = game.currentQuestion + 1;
    document.getElementById('game-question-text').textContent = question.text;
    document.getElementById('game-timer').textContent = question.timeLimit;
    
    // Create options
    const optionsContainer = document.getElementById('game-options');
    optionsContainer.innerHTML = question.options.map((option, index) => {
        const optionLetter = String.fromCharCode(65 + index);
        return `
            <div class="option" onclick="selectAnswer(${index + 1})">
                <span class="option-letter">${optionLetter}</span>
                <span class="option-text">${option}</span>
            </div>
        `;
    }).join('');
    
    // Reset feedback
    document.getElementById('answer-feedback').classList.add('hidden');
}

// Select an answer
function selectAnswer(answerIndex) {
    const game = getCurrentGame();
    if (!game || game.status !== 'playing') return;
    
    // Record answer
    game.players[playerId].answers = game.players[playerId].answers || {};
    game.players[playerId].answers[game.currentQuestion] = answerIndex;
    
    // Calculate time taken (simplified)
    const timeTaken = Math.max(1, 20 - parseInt(document.getElementById('game-timer').textContent));
    
    // Update score if correct
    const question = game.questions[game.currentQuestion];
    if (answerIndex === question.correctAnswer) {
        const points = calculatePoints(timeTaken, question.timeLimit);
        game.players[playerId].score = (game.players[playerId].score || 0) + points;
        
        showAnswerFeedback(true, points);
    } else {
        showAnswerFeedback(false, 0);
    }
    
    // Save game
    const games = getGames();
    games[currentGamePin] = game;
    localStorage.setItem('kahootGames', JSON.stringify(games));
    
    // Disable further answers
    document.querySelectorAll('.option').forEach(option => {
        option.style.pointerEvents = 'none';
    });
}

// Calculate points based on time taken
function calculatePoints(timeTaken, timeLimit) {
    // Faster answers get more points
    const basePoints = 10;
    const timeBonus = Math.max(1, Math.floor((timeLimit - timeTaken) / 2));
    return basePoints + timeBonus;
}

// Show answer feedback
function showAnswerFeedback(isCorrect, points) {
    const feedback = document.getElementById('answer-feedback');
    feedback.classList.remove('hidden');
    
    if (isCorrect) {
        feedback.innerHTML = `
            <div style="color: var(--success); text-align: center; padding: 20px;">
                <h3>✅ Correct!</h3>
                <p>You earned ${points} points!</p>
            </div>
        `;
    } else {
        feedback.innerHTML = `
            <div style="color: var(--danger); text-align: center; padding: 20px;">
                <h3>❌ Incorrect</h3>
                <p>Better luck next time!</p>
            </div>
        `;
    }
}

// Update leaderboard
function updateLeaderboard() {
    const game = getCurrentGame();
    if (!game) return;
    
    const leaderboard = document.getElementById('mini-leaderboard');
    
    // Sort players by score
    const sortedPlayers = Object.entries(game.players)
        .sort(([,a], [,b]) => (b.score || 0) - (a.score || 0))
        .slice(0, 5); // Show top 5
    
    leaderboard.innerHTML = sortedPlayers.map(([id, player], index) => `
        <div class="leaderboard-item ${id === playerId ? 'you' : ''}">
            <div>
                <span class="position">${index + 1}</span>
                <span>${player.name}</span>
            </div>
            <div>${player.score || 0}</div>
        </div>
    `).join('');
}

// Show final results
function showFinalResults(game) {
    document.getElementById('final-score').textContent = game.players[playerId]?.score || 0;
    
    // Sort players by score
    const sortedPlayers = Object.entries(game.players)
        .sort(([,a], [,b]) => (b.score || 0) - (a.score || 0));
    
    const leaderboard = document.getElementById('final-leaderboard');
    leaderboard.innerHTML = sortedPlayers.map(([id, player], index) => `
        <div class="leaderboard-item ${id === playerId ? 'you' : ''}">
            <div>
                <span class="position">${index + 1}</span>
                <span>${player.name}</span>
            </div>
            <div>${player.score || 0} pts</div>
        </div>
    `).join('');
}

// Leave the game
function leaveGame() {
    if (playerInterval) {
        clearInterval(playerInterval);
    }
    
    // Remove player from game
    if (currentGamePin && playerId) {
        const games = getGames();
        const game = games[currentGamePin];
        if (game && game.players[playerId]) {
            delete game.players[playerId];
            localStorage.setItem('kahootGames', JSON.stringify(games));
        }
    }
    
    // Reset state
    playerId = null;
    currentGamePin = null;
    
    // Show join screen
    showScreen('join-screen');
    
    // Clear form
    document.getElementById('game-pin').value = '';
    document.getElementById('player-name').value = '';
}

// Play again (rejoin)
function playAgain() {
    leaveGame();
}

// Get current game
function getCurrentGame() {
    const games = getGames();
    return games[currentGamePin];
}

// Get all games
function getGames() {
    return JSON.parse(localStorage.getItem('kahootGames') || '{}');
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check for game PIN in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const pinFromUrl = urlParams.get('pin');
    
    if (pinFromUrl) {
        document.getElementById('game-pin').value = pinFromUrl;
    }
});
package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gofiber/websocket/v2"
)

type Client struct {
	JobID string
	Conn  *websocket.Conn
	Send  chan interface{}
}

type Manager struct {
	clients    map[string]map[*Client]bool
	broadcast  chan Message
	register   chan *Client
	unregister chan *Client
	mutex      sync.RWMutex
}

type Message struct {
	JobID   string
	Payload interface{}
}

func NewManager() *Manager {
	return &Manager{
		clients:    make(map[string]map[*Client]bool),
		broadcast:  make(chan Message, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (m *Manager) Run() {
	for {
		select {
		case client := <-m.register:
			m.mutex.Lock()
			if m.clients[client.JobID] == nil {
				m.clients[client.JobID] = make(map[*Client]bool)
			}
			m.clients[client.JobID][client] = true
			m.mutex.Unlock()

		case client := <-m.unregister:
			m.mutex.Lock()
			if clients, ok := m.clients[client.JobID]; ok {
				if _, ok := clients[client]; ok {
					delete(clients, client)
					close(client.Send)
					if len(clients) == 0 {
						delete(m.clients, client.JobID)
					}
				}
			}
			m.mutex.Unlock()

		case message := <-m.broadcast:
			m.mutex.RLock()
			if clients, ok := m.clients[message.JobID]; ok {
				for client := range clients {
					select {
					case client.Send <- message.Payload:
					default:
						close(client.Send)
						delete(clients, client)
					}
				}
			}
			m.mutex.RUnlock()
		}
	}
}

func (m *Manager) BroadcastToJob(jobID string, payload interface{}) {
	m.broadcast <- Message{
		JobID:   jobID,
		Payload: payload,
	}
}

func (m *Manager) RegisterClient(client *Client) {
	m.register <- client
}

func (m *Manager) UnregisterClient(client *Client) {
	m.unregister <- client
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			if !ok {
				// Channel closed
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			data, err := json.Marshal(message)
			if err != nil {
				return
			}

			if err := c.Conn.WriteMessage(websocket.TextMessage, data); err != nil {
				return
			}

		case <-ticker.C:
			// Send ping to keep connection alive
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) ReadPump(m *Manager) {
	defer func() {
		m.UnregisterClient(c)
		c.Conn.Close()
	}()

	// Set max message size and read deadline
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket closed unexpectedly: %v", err)
			}
			break
		}
		// Reset read deadline on any message
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	}
}

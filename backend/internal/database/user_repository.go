package database

import (
	"database/sql"
	"fmt"
	"time"
)

type User struct {
	ID           string
	Email        string
	PasswordHash string
	Name         string
	Role         string
	IsActive     bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type UserRepository struct {
	db *DB
}

func NewUserRepository(db *DB) *UserRepository {
	return &UserRepository{db: db}
}

// CreateUser creates a new user
func (r *UserRepository) CreateUser(user *User) error {
	query := `
		INSERT INTO users (id, email, password_hash, name, role, is_active)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err := r.db.Exec(query,
		user.ID,
		user.Email,
		user.PasswordHash,
		user.Name,
		user.Role,
		user.IsActive,
	)

	return err
}

// GetUserByID retrieves a user by ID
func (r *UserRepository) GetUserByID(userID string) (*User, error) {
	query := `
		SELECT id, email, password_hash, name, role, is_active, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var user User
	err := r.db.QueryRow(query, userID).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Name,
		&user.Role,
		&user.IsActive,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}

	return &user, nil
}

// GetUserByEmail retrieves a user by email
func (r *UserRepository) GetUserByEmail(email string) (*User, error) {
	query := `
		SELECT id, email, password_hash, name, role, is_active, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	var user User
	err := r.db.QueryRow(query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Name,
		&user.Role,
		&user.IsActive,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}

	return &user, nil
}

// UpdateUser updates a user
func (r *UserRepository) UpdateUser(user *User) error {
	query := `
		UPDATE users SET
			email = $1,
			name = $2,
			role = $3,
			is_active = $4,
			updated_at = $5
		WHERE id = $6
	`

	_, err := r.db.Exec(query,
		user.Email,
		user.Name,
		user.Role,
		user.IsActive,
		time.Now(),
		user.ID,
	)

	return err
}

// UpdatePassword updates a user's password
func (r *UserRepository) UpdatePassword(userID, passwordHash string) error {
	query := `
		UPDATE users SET
			password_hash = $1,
			updated_at = $2
		WHERE id = $3
	`

	_, err := r.db.Exec(query, passwordHash, time.Now(), userID)
	return err
}

// DeleteUser deletes a user
func (r *UserRepository) DeleteUser(userID string) error {
	query := `DELETE FROM users WHERE id = $1`
	_, err := r.db.Exec(query, userID)
	return err
}

// ListUsers retrieves all users with pagination
func (r *UserRepository) ListUsers(limit, offset int) ([]*User, error) {
	query := `
		SELECT id, email, password_hash, name, role, is_active, created_at, updated_at
		FROM users
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.Query(query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*User
	for rows.Next() {
		var user User
		err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.PasswordHash,
			&user.Name,
			&user.Role,
			&user.IsActive,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, &user)
	}

	return users, nil
}

// EmailExists checks if an email already exists
func (r *UserRepository) EmailExists(email string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`
	var exists bool
	err := r.db.QueryRow(query, email).Scan(&exists)
	return exists, err
}

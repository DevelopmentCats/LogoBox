<template>
  <div class="search-bar" :class="{ 'search-bar--focused': isFocused, 'search-bar--has-suggestions': hasSuggestions }">
    <div class="search-bar__input-container">
      <div class="search-bar__icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
      </div>
      
      <input
        ref="searchInput"
        v-model="localQuery"
        type="text"
        class="search-bar__input"
        :placeholder="placeholder"
        :aria-label="ariaLabel"
        :aria-expanded="hasSuggestions"
        :aria-activedescendant="activeSuggestionId"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        role="combobox"
        autocomplete="off"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
        @input="handleInput"
      />
      
      <button
        v-if="localQuery"
        type="button"
        class="search-bar__clear"
        :aria-label="clearAriaLabel"
        @click="clearSearch"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      
      <div v-if="isLoading" class="search-bar__loading" aria-hidden="true">
        <svg class="search-bar__spinner" width="16" height="16" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="60" stroke-dashoffset="60" stroke-linecap="round">
            <animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="1s" repeatCount="indefinite"/>
          </circle>
        </svg>
      </div>
    </div>
    
    <!-- Suggestions dropdown -->
    <div
      v-if="hasSuggestions"
      ref="suggestionsContainer"
      class="search-bar__suggestions"
      role="listbox"
      :aria-label="suggestionsAriaLabel"
    >
      <!-- Search suggestions -->
      <div v-if="filteredSuggestions.length > 0" class="search-bar__suggestions-section">
        <div class="search-bar__suggestions-header">Suggestions</div>
        <button
          v-for="(suggestion, index) in filteredSuggestions"
          :key="`suggestion-${index}`"
          :id="getSuggestionId('suggestion', index)"
          type="button"
          class="search-bar__suggestion"
          :class="{ 'search-bar__suggestion--active': activeSuggestionIndex === getSuggestionGlobalIndex('suggestion', index) }"
          role="option"
          :aria-selected="activeSuggestionIndex === getSuggestionGlobalIndex('suggestion', index)"
          @click="selectSuggestion(suggestion)"
          @mouseenter="setActiveSuggestion(getSuggestionGlobalIndex('suggestion', index))"
        >
          <span class="search-bar__suggestion-text" v-html="highlightMatch(suggestion)"></span>
          <span class="search-bar__suggestion-type">suggestion</span>
        </button>
      </div>
      
      <!-- Search history -->
      <div v-if="filteredHistory.length > 0" class="search-bar__suggestions-section">
        <div class="search-bar__suggestions-header">Recent searches</div>
        <button
          v-for="(historyItem, index) in filteredHistory"
          :key="`history-${index}`"
          :id="getSuggestionId('history', index)"
          type="button"
          class="search-bar__suggestion"
          :class="{ 'search-bar__suggestion--active': activeSuggestionIndex === getSuggestionGlobalIndex('history', index) }"
          role="option"
          :aria-selected="activeSuggestionIndex === getSuggestionGlobalIndex('history', index)"
          @click="selectHistoryItem(historyItem)"
          @mouseenter="setActiveSuggestion(getSuggestionGlobalIndex('history', index))"
        >
          <span class="search-bar__suggestion-text">{{ historyItem }}</span>
          <span class="search-bar__suggestion-type">recent</span>
        </button>
      </div>
      
      <!-- No suggestions message -->
      <div v-if="localQuery && !filteredSuggestions.length && !filteredHistory.length" class="search-bar__no-suggestions">
        No suggestions found
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useLogoSearch } from '../composables/useLogoSearch.js'

export default {
  name: 'SearchBar',
  
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: 'Search logos...'
    },
    ariaLabel: {
      type: String,
      default: 'Search for logos'
    },
    clearAriaLabel: {
      type: String,
      default: 'Clear search'
    },
    suggestionsAriaLabel: {
      type: String,
      default: 'Search suggestions'
    },
    maxSuggestions: {
      type: Number,
      default: 6
    },
    maxHistory: {
      type: Number,
      default: 4
    },
    showSuggestions: {
      type: Boolean,
      default: true
    },
    showHistory: {
      type: Boolean,
      default: true
    },
    debounceDelay: {
      type: Number,
      default: 300
    }
  },
  
  emits: ['update:modelValue', 'search', 'focus', 'blur', 'clear', 'suggestion-select'],
  
  setup(props, { emit }) {
    // Use the search composable
    const {
      searchQuery,
      searchSuggestions,
      searchHistory,
      isLoading,
      setSearchQuery,
      clearSearchQuery,
      selectSuggestion: selectSearchSuggestion,
      selectHistoryItem: selectSearchHistoryItem
    } = useLogoSearch({
      debounceDelay: props.debounceDelay
    })
    
    // Component state
    const searchInput = ref(null)
    const suggestionsContainer = ref(null)
    const isFocused = ref(false)
    const showSuggestionsDropdown = ref(false)
    const activeSuggestionIndex = ref(-1)
    const localQuery = ref(props.modelValue)
    
    // Computed properties
    const filteredSuggestions = computed(() => {
      if (!props.showSuggestions || !localQuery.value.trim()) return []
      
      return searchSuggestions.value
        .filter(suggestion => 
          suggestion.toLowerCase().includes(localQuery.value.toLowerCase()) &&
          suggestion.toLowerCase() !== localQuery.value.toLowerCase()
        )
        .slice(0, props.maxSuggestions)
    })
    
    const filteredHistory = computed(() => {
      if (!props.showHistory || !localQuery.value.trim()) return []
      
      return searchHistory.value
        .filter(historyItem => 
          historyItem.toLowerCase().includes(localQuery.value.toLowerCase()) &&
          historyItem.toLowerCase() !== localQuery.value.toLowerCase()
        )
        .slice(0, props.maxHistory)
    })
    
    const allSuggestions = computed(() => [
      ...filteredSuggestions.value,
      ...filteredHistory.value
    ])
    
    const hasSuggestions = computed(() => 
      showSuggestionsDropdown.value && 
      isFocused.value && 
      (filteredSuggestions.value.length > 0 || filteredHistory.value.length > 0 || localQuery.value.trim())
    )
    
    const activeSuggestionId = computed(() => {
      if (activeSuggestionIndex.value === -1) return null
      
      const suggestionCount = filteredSuggestions.value.length
      
      if (activeSuggestionIndex.value < suggestionCount) {
        return getSuggestionId('suggestion', activeSuggestionIndex.value)
      } else {
        return getSuggestionId('history', activeSuggestionIndex.value - suggestionCount)
      }
    })
    
    // Helper functions
    const getSuggestionId = (type, index) => `search-${type}-${index}`
    
    const getSuggestionGlobalIndex = (type, index) => {
      if (type === 'suggestion') return index
      return filteredSuggestions.value.length + index
    }
    
    const highlightMatch = (text) => {
      if (!localQuery.value.trim()) return text
      
      const query = localQuery.value.trim()
      const regex = new RegExp(`(${query})`, 'gi')
      return text.replace(regex, '<mark>$1</mark>')
    }
    
    // Event handlers
    const handleFocus = () => {
      isFocused.value = true
      showSuggestionsDropdown.value = true
      emit('focus')
    }
    
    const handleBlur = (event) => {
      // Delay hiding suggestions to allow for clicks
      setTimeout(() => {
        if (!suggestionsContainer.value?.contains(document.activeElement)) {
          isFocused.value = false
          showSuggestionsDropdown.value = false
          activeSuggestionIndex.value = -1
        }
      }, 150)
      
      emit('blur', event)
    }
    
    const handleInput = (event) => {
      const value = event.target.value
      localQuery.value = value
      
      // Reset active suggestion when typing
      activeSuggestionIndex.value = -1
      showSuggestionsDropdown.value = true
      
      emit('update:modelValue', value)
    }
    
    const handleKeydown = (event) => {
      const { key } = event
      
      switch (key) {
        case 'ArrowDown':
          event.preventDefault()
          navigateSuggestions(1)
          break
          
        case 'ArrowUp':
          event.preventDefault()
          navigateSuggestions(-1)
          break
          
        case 'Enter':
          event.preventDefault()
          if (activeSuggestionIndex.value >= 0) {
            selectActiveSuggestion()
          } else {
            performSearch()
          }
          break
          
        case 'Escape':
          event.preventDefault()
          closeSuggestions()
          break
          
        case 'Tab':
          if (hasSuggestions.value) {
            event.preventDefault()
            if (activeSuggestionIndex.value >= 0) {
              selectActiveSuggestion()
            } else if (allSuggestions.value.length > 0) {
              setActiveSuggestion(0)
            }
          }
          break
      }
    }
    
    const navigateSuggestions = (direction) => {
      if (!hasSuggestions.value) return
      
      const maxIndex = allSuggestions.value.length - 1
      let newIndex = activeSuggestionIndex.value + direction
      
      if (newIndex < 0) {
        newIndex = maxIndex
      } else if (newIndex > maxIndex) {
        newIndex = 0
      }
      
      setActiveSuggestion(newIndex)
    }
    
    const setActiveSuggestion = (index) => {
      activeSuggestionIndex.value = index
      
      // Scroll active suggestion into view
      nextTick(() => {
        const activeElement = document.getElementById(activeSuggestionId.value)
        if (activeElement) {
          activeElement.scrollIntoView({ block: 'nearest' })
        }
      })
    }
    
    const selectActiveSuggestion = () => {
      if (activeSuggestionIndex.value === -1) return
      
      const suggestionCount = filteredSuggestions.value.length
      
      if (activeSuggestionIndex.value < suggestionCount) {
        const suggestion = filteredSuggestions.value[activeSuggestionIndex.value]
        selectSuggestion(suggestion)
      } else {
        const historyIndex = activeSuggestionIndex.value - suggestionCount
        const historyItem = filteredHistory.value[historyIndex]
        selectHistoryItem(historyItem)
      }
    }
    
    const selectSuggestion = (suggestion) => {
      localQuery.value = suggestion
      setSearchQuery(suggestion)
      selectSearchSuggestion(suggestion)
      closeSuggestions()
      emit('update:modelValue', suggestion)
      emit('suggestion-select', { type: 'suggestion', value: suggestion })
      emit('search', suggestion)
    }
    
    const selectHistoryItem = (historyItem) => {
      localQuery.value = historyItem
      setSearchQuery(historyItem)
      selectSearchHistoryItem(historyItem)
      closeSuggestions()
      emit('update:modelValue', historyItem)
      emit('suggestion-select', { type: 'history', value: historyItem })
      emit('search', historyItem)
    }
    
    const clearSearch = () => {
      localQuery.value = ''
      clearSearchQuery()
      closeSuggestions()
      searchInput.value?.focus()
      emit('update:modelValue', '')
      emit('clear')
    }
    
    const closeSuggestions = () => {
      showSuggestionsDropdown.value = false
      activeSuggestionIndex.value = -1
    }
    
    const performSearch = () => {
      if (localQuery.value.trim()) {
        setSearchQuery(localQuery.value.trim())
        closeSuggestions()
        emit('search', localQuery.value.trim())
      }
    }
    
    // Handle clicks outside to close suggestions
    const handleClickOutside = (event) => {
      if (!searchInput.value?.contains(event.target) && 
          !suggestionsContainer.value?.contains(event.target)) {
        closeSuggestions()
        isFocused.value = false
      }
    }
    
    // Watch for prop changes
    watch(() => props.modelValue, (newValue) => {
      if (newValue !== localQuery.value) {
        localQuery.value = newValue
        setSearchQuery(newValue)
      }
    })
    
    // Sync local query with search composable
    watch(localQuery, (newValue) => {
      setSearchQuery(newValue)
    })
    
    // Lifecycle
    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })
    
    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })
    
    return {
      // Refs
      searchInput,
      suggestionsContainer,
      
      // State
      localQuery,
      isFocused,
      activeSuggestionIndex,
      
      // Computed
      filteredSuggestions,
      filteredHistory,
      hasSuggestions,
      activeSuggestionId,
      isLoading,
      
      // Methods
      handleFocus,
      handleBlur,
      handleInput,
      handleKeydown,
      selectSuggestion,
      selectHistoryItem,
      clearSearch,
      getSuggestionId,
      getSuggestionGlobalIndex,
      setActiveSuggestion,
      highlightMatch
    }
  }
}
</script>

<style scoped>
.search-bar {
  position: relative;
  width: 100%;
  max-width: 600px;
}

.search-bar__input-container {
  position: relative;
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.search-bar--focused .search-bar__input-container {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-bar__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  color: #64748b;
  pointer-events: none;
}

.search-bar__input {
  flex: 1;
  padding: 12px 8px 12px 0;
  border: none;
  outline: none;
  font-size: 16px;
  line-height: 1.5;
  color: #1e293b;
  background: transparent;
}

.search-bar__input::placeholder {
  color: #94a3b8;
}

.search-bar__clear,
.search-bar__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
}

.search-bar__clear {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.search-bar__clear:hover {
  color: #ef4444;
  background: #fef2f2;
}

.search-bar__clear:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.search-bar__loading {
  color: #3b82f6;
}

.search-bar__spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.search-bar__suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 50;
  margin-top: 4px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-height: 300px;
  overflow-y: auto;
}

.search-bar__suggestions-section {
  padding: 8px 0;
}

.search-bar__suggestions-section:not(:last-child) {
  border-bottom: 1px solid #f1f5f9;
}

.search-bar__suggestions-header {
  padding: 8px 16px 4px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.search-bar__suggestion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #1e293b;
}

.search-bar__suggestion:hover,
.search-bar__suggestion--active {
  background: #f8fafc;
  color: #3b82f6;
}

.search-bar__suggestion:focus {
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
}

.search-bar__suggestion-text {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
}

.search-bar__suggestion-text :deep(mark) {
  background: #dbeafe;
  color: #1e40af;
  padding: 0 2px;
  border-radius: 2px;
}

.search-bar__suggestion-type {
  font-size: 11px;
  color: #94a3b8;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.search-bar__no-suggestions {
  padding: 16px;
  text-align: center;
  color: #64748b;
  font-size: 14px;
}

/* Responsive design */
@media (max-width: 640px) {
  .search-bar__input {
    font-size: 16px; /* Prevent zoom on iOS */
  }
  
  .search-bar__suggestions {
    max-height: 250px;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .search-bar__input-container {
    border-width: 2px;
  }
  
  .search-bar--focused .search-bar__input-container {
    border-width: 3px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .search-bar__input-container,
  .search-bar__clear,
  .search-bar__suggestion {
    transition: none;
  }
  
  .search-bar__spinner {
    animation: none;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .search-bar__input-container {
    background: #1e293b;
    border-color: #475569;
  }
  
  .search-bar--focused .search-bar__input-container {
    border-color: #60a5fa;
    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
  }
  
  .search-bar__input {
    color: #f1f5f9;
  }
  
  .search-bar__input::placeholder {
    color: #64748b;
  }
  
  .search-bar__icon,
  .search-bar__clear {
    color: #94a3b8;
  }
  
  .search-bar__clear:hover {
    color: #f87171;
    background: #450a0a;
  }
  
  .search-bar__suggestions {
    background: #1e293b;
    border-color: #475569;
  }
  
  .search-bar__suggestions-section {
    border-color: #334155;
  }
  
  .search-bar__suggestions-header {
    color: #94a3b8;
  }
  
  .search-bar__suggestion {
    color: #f1f5f9;
  }
  
  .search-bar__suggestion:hover,
  .search-bar__suggestion--active {
    background: #334155;
    color: #60a5fa;
  }
  
  .search-bar__suggestion-text :deep(mark) {
    background: #1e40af;
    color: #dbeafe;
  }
  
  .search-bar__suggestion-type {
    color: #64748b;
    background: #334155;
  }
  
  .search-bar__no-suggestions {
    color: #94a3b8;
  }
}
</style>
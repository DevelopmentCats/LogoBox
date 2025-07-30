<template>
  <div class="filter-panel" :class="{ 'filter-panel--collapsed': isCollapsed }">
    <!-- Header with toggle and clear -->
    <div class="filter-panel__header">
      <button
        type="button"
        class="filter-panel__toggle"
        :aria-expanded="!isCollapsed"
        :aria-label="isCollapsed ? 'Expand filters' : 'Collapse filters'"
        @click="toggleCollapsed"
      >
        <span class="filter-panel__title">
          Filters
          <span v-if="activeFilterCount > 0" class="filter-panel__count">
            ({{ activeFilterCount }})
          </span>
        </span>
        <svg 
          class="filter-panel__toggle-icon" 
          :class="{ 'filter-panel__toggle-icon--rotated': !isCollapsed }"
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2"
        >
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>
      </button>
      
      <button
        v-if="hasActiveFilters"
        type="button"
        class="filter-panel__clear"
        :aria-label="clearAllAriaLabel"
        @click="handleClearAll"
      >
        Clear all
      </button>
    </div>

    <!-- Filter content -->
    <div v-show="!isCollapsed" class="filter-panel__content">
      <!-- Categories section -->
      <div v-if="showCategories && availableCategories.length > 0" class="filter-panel__section">
        <div class="filter-panel__section-header">
          <h3 class="filter-panel__section-title">Categories</h3>
          <button
            v-if="selectedCategories.length > 0"
            type="button"
            class="filter-panel__section-clear"
            :aria-label="clearCategoriesAriaLabel"
            @click="handleClearCategories"
          >
            Clear
          </button>
        </div>
        
        <div class="filter-panel__options" role="group" :aria-labelledby="categoriesLabelId">
          <label
            v-for="category in availableCategories"
            :key="category.name"
            class="filter-panel__option"
            :class="{ 'filter-panel__option--selected': selectedCategories.includes(category.name) }"
          >
            <input
              type="checkbox"
              class="filter-panel__checkbox"
              :value="category.name"
              :checked="selectedCategories.includes(category.name)"
              :aria-describedby="getCategoryDescriptionId(category.name)"
              @change="handleCategoryChange(category.name, $event)"
            />
            <span class="filter-panel__option-content">
              <span class="filter-panel__option-text">{{ category.name }}</span>
              <span 
                :id="getCategoryDescriptionId(category.name)"
                class="filter-panel__option-count"
                :aria-label="`${category.count} logos in ${category.name} category`"
              >
                {{ category.count }}
              </span>
            </span>
          </label>
        </div>
      </div>

      <!-- Tags section -->
      <div v-if="showTags && availableTags.length > 0" class="filter-panel__section">
        <div class="filter-panel__section-header">
          <h3 class="filter-panel__section-title">Tags</h3>
          <button
            v-if="selectedTags.length > 0"
            type="button"
            class="filter-panel__section-clear"
            :aria-label="clearTagsAriaLabel"
            @click="handleClearTags"
          >
            Clear
          </button>
        </div>
        
        <div class="filter-panel__options" role="group" :aria-labelledby="tagsLabelId">
          <label
            v-for="tag in availableTags"
            :key="tag.name"
            class="filter-panel__option"
            :class="{ 'filter-panel__option--selected': selectedTags.includes(tag.name) }"
          >
            <input
              type="checkbox"
              class="filter-panel__checkbox"
              :value="tag.name"
              :checked="selectedTags.includes(tag.name)"
              :aria-describedby="getTagDescriptionId(tag.name)"
              @change="handleTagChange(tag.name, $event)"
            />
            <span class="filter-panel__option-content">
              <span class="filter-panel__option-text">{{ tag.name }}</span>
              <span 
                :id="getTagDescriptionId(tag.name)"
                class="filter-panel__option-count"
                :aria-label="`${tag.count} logos with ${tag.name} tag`"
              >
                {{ tag.count }}
              </span>
            </span>
          </label>
        </div>
      </div>

      <!-- No filters message -->
      <div v-if="(!showCategories || availableCategories.length === 0) && (!showTags || availableTags.length === 0)" class="filter-panel__empty">
        No filters available
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useLogoFilters } from '../composables/useLogoFilters.js'

export default {
  name: 'FilterPanel',
  
  props: {
    showCategories: {
      type: Boolean,
      default: true
    },
    showTags: {
      type: Boolean,
      default: true
    },
    initiallyCollapsed: {
      type: Boolean,
      default: false
    },
    clearAllAriaLabel: {
      type: String,
      default: 'Clear all filters'
    },
    clearCategoriesAriaLabel: {
      type: String,
      default: 'Clear category filters'
    },
    clearTagsAriaLabel: {
      type: String,
      default: 'Clear tag filters'
    },
    collapsible: {
      type: Boolean,
      default: true
    }
  },
  
  emits: [
    'category-change',
    'tag-change', 
    'clear-categories',
    'clear-tags',
    'clear-all',
    'collapse-change'
  ],
  
  setup(props, { emit }) {
    // Use the filters composable
    const {
      selectedCategories,
      selectedTags,
      availableCategories,
      availableTags,
      hasActiveFilters,
      activeFilterCount,
      toggleCategoryFilter,
      toggleTagFilter,
      clearCategoryFilters,
      clearTagFilters,
      clearAllFilters
    } = useLogoFilters()
    
    // Component state
    const isCollapsed = ref(props.initiallyCollapsed)
    
    // Computed properties
    const categoriesLabelId = computed(() => 'filter-categories-label')
    const tagsLabelId = computed(() => 'filter-tags-label')
    
    // Helper functions
    const getCategoryDescriptionId = (categoryName) => `category-${categoryName}-count`
    const getTagDescriptionId = (tagName) => `tag-${tagName}-count`
    
    // Event handlers
    const toggleCollapsed = () => {
      if (!props.collapsible) return
      
      isCollapsed.value = !isCollapsed.value
      emit('collapse-change', isCollapsed.value)
    }
    
    const handleCategoryChange = (categoryName, event) => {
      const isChecked = event.target.checked
      const result = toggleCategoryFilter(categoryName)
      
      if (result) {
        emit('category-change', {
          category: categoryName,
          selected: isChecked,
          selectedCategories: [...selectedCategories.value]
        })
      }
    }
    
    const handleTagChange = (tagName, event) => {
      const isChecked = event.target.checked
      const result = toggleTagFilter(tagName)
      
      if (result) {
        emit('tag-change', {
          tag: tagName,
          selected: isChecked,
          selectedTags: [...selectedTags.value]
        })
      }
    }
    
    const handleClearCategories = () => {
      clearCategoryFilters()
      emit('clear-categories', {
        previousCategories: [...selectedCategories.value]
      })
    }
    
    const handleClearTags = () => {
      clearTagFilters()
      emit('clear-tags', {
        previousTags: [...selectedTags.value]
      })
    }
    
    const handleClearAll = () => {
      const previousState = {
        categories: [...selectedCategories.value],
        tags: [...selectedTags.value]
      }
      
      clearAllFilters()
      emit('clear-all', previousState)
    }
    
    // Keyboard navigation support
    const handleKeydown = (event) => {
      // Handle Escape key to collapse panel
      if (event.key === 'Escape' && !isCollapsed.value && props.collapsible) {
        toggleCollapsed()
        event.preventDefault()
      }
    }
    
    // Lifecycle
    onMounted(() => {
      document.addEventListener('keydown', handleKeydown)
    })
    
    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown)
    })
    
    return {
      // State
      isCollapsed,
      
      // From composable
      selectedCategories,
      selectedTags,
      availableCategories,
      availableTags,
      hasActiveFilters,
      activeFilterCount,
      
      // Computed
      categoriesLabelId,
      tagsLabelId,
      
      // Methods
      toggleCollapsed,
      handleCategoryChange,
      handleTagChange,
      handleClearCategories,
      handleClearTags,
      handleClearAll,
      getCategoryDescriptionId,
      getTagDescriptionId
    }
  }
}
</script>

<style scoped>
.filter-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.filter-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;
}

.filter-panel--collapsed .filter-panel__header {
  border-bottom: none;
}

.filter-panel__toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #1e293b;
  font-weight: 600;
  font-size: 16px;
  transition: color 0.2s ease;
}

.filter-panel__toggle:hover {
  color: #3b82f6;
}

.filter-panel__toggle:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
  border-radius: 4px;
}

.filter-panel__title {
  display: flex;
  align-items: center;
  gap: 4px;
}

.filter-panel__count {
  color: #64748b;
  font-weight: 500;
  font-size: 14px;
}

.filter-panel__toggle-icon {
  transition: transform 0.2s ease;
  color: #64748b;
}

.filter-panel__toggle-icon--rotated {
  transform: rotate(180deg);
}

.filter-panel__clear {
  background: none;
  border: 1px solid #e2e8f0;
  padding: 6px 12px;
  border-radius: 6px;
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.filter-panel__clear:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #ef4444;
}

.filter-panel__clear:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.filter-panel__content {
  padding: 0;
}

.filter-panel__section {
  padding: 16px;
}

.filter-panel__section:not(:last-child) {
  border-bottom: 1px solid #f1f5f9;
}

.filter-panel__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.filter-panel__section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.filter-panel__section-clear {
  background: none;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  color: #64748b;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.filter-panel__section-clear:hover {
  background: #fef2f2;
  color: #ef4444;
}

.filter-panel__section-clear:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.filter-panel__options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-panel__option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.filter-panel__option:hover {
  background: #f8fafc;
}

.filter-panel__option--selected {
  background: #eff6ff;
  border: 1px solid #dbeafe;
}

.filter-panel__option:focus-within {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.filter-panel__checkbox {
  width: 16px;
  height: 16px;
  border: 2px solid #d1d5db;
  border-radius: 3px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  position: relative;
  flex-shrink: 0;
}

.filter-panel__checkbox:checked {
  background: #3b82f6;
  border-color: #3b82f6;
}

.filter-panel__checkbox:checked::after {
  content: '';
  position: absolute;
  top: 1px;
  left: 4px;
  width: 4px;
  height: 8px;
  border: 2px solid white;
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}

.filter-panel__checkbox:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.filter-panel__option-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  min-width: 0;
}

.filter-panel__option-text {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
  text-transform: capitalize;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-panel__option--selected .filter-panel__option-text {
  color: #1e40af;
  font-weight: 600;
}

.filter-panel__option-count {
  font-size: 12px;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
  min-width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.filter-panel__option--selected .filter-panel__option-count {
  background: #dbeafe;
  color: #1e40af;
}

.filter-panel__empty {
  padding: 24px 16px;
  text-align: center;
  color: #64748b;
  font-size: 14px;
  font-style: italic;
}

/* Responsive design */
@media (max-width: 640px) {
  .filter-panel__header {
    padding: 12px;
  }
  
  .filter-panel__section {
    padding: 12px;
  }
  
  .filter-panel__option {
    padding: 6px;
  }
  
  .filter-panel__option-text {
    font-size: 13px;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .filter-panel {
    border-width: 2px;
  }
  
  .filter-panel__checkbox {
    border-width: 2px;
  }
  
  .filter-panel__option--selected {
    border-width: 2px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .filter-panel,
  .filter-panel__toggle,
  .filter-panel__toggle-icon,
  .filter-panel__clear,
  .filter-panel__section-clear,
  .filter-panel__option,
  .filter-panel__checkbox {
    transition: none;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .filter-panel {
    background: #1e293b;
    border-color: #475569;
  }
  
  .filter-panel__header {
    background: #334155;
    border-color: #475569;
  }
  
  .filter-panel__toggle {
    color: #f1f5f9;
  }
  
  .filter-panel__toggle:hover {
    color: #60a5fa;
  }
  
  .filter-panel__count {
    color: #94a3b8;
  }
  
  .filter-panel__toggle-icon {
    color: #94a3b8;
  }
  
  .filter-panel__clear {
    border-color: #475569;
    color: #94a3b8;
  }
  
  .filter-panel__clear:hover {
    background: #450a0a;
    border-color: #7f1d1d;
    color: #f87171;
  }
  
  .filter-panel__section {
    border-color: #475569;
  }
  
  .filter-panel__section-title {
    color: #e2e8f0;
  }
  
  .filter-panel__section-clear {
    color: #94a3b8;
  }
  
  .filter-panel__section-clear:hover {
    background: #450a0a;
    color: #f87171;
  }
  
  .filter-panel__option:hover {
    background: #334155;
  }
  
  .filter-panel__option--selected {
    background: #1e40af;
    border-color: #3b82f6;
  }
  
  .filter-panel__checkbox {
    border-color: #6b7280;
    background: #374151;
  }
  
  .filter-panel__checkbox:checked {
    background: #60a5fa;
    border-color: #60a5fa;
  }
  
  .filter-panel__option-text {
    color: #e2e8f0;
  }
  
  .filter-panel__option--selected .filter-panel__option-text {
    color: #dbeafe;
  }
  
  .filter-panel__option-count {
    color: #94a3b8;
    background: #475569;
  }
  
  .filter-panel__option--selected .filter-panel__option-count {
    background: #3b82f6;
    color: #dbeafe;
  }
  
  .filter-panel__empty {
    color: #94a3b8;
  }
}
</style>
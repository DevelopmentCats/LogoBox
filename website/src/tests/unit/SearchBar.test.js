/**
 * Unit tests for SearchBar component
 * Tests user interactions, search behavior, keyboard navigation, and accessibility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import SearchBar from '../../components/SearchBar.vue'

// Mock the useLogoSearch composable
vi.mock('../../composables/useLogoSearch.js', () => ({
  useLogoSearch: vi.fn()
}))

describe('SearchBar', () => {
  let wrapper
  let mockSearchComposable
  let pinia
  let mockUseLogoSearch

  beforeEach(async () => {
    // Create fresh Pinia instance
    pinia = createPinia()
    setActivePinia(pinia)

    // Get the mocked function
    const { useLogoSearch } = await import('../../composables/useLogoSearch.js')
    mockUseLogoSearch = useLogoSearch

    // Mock search composable return value
    mockSearchComposable = {
      searchQuery: { value: '' },
      searchSuggestions: { value: ['github', 'google', 'microsoft'] },
      searchHistory: { value: ['previous search', 'another search'] },
      isLoading: { value: false },
      setSearchQuery: vi.fn(),
      clearSearchQuery: vi.fn(),
      selectSuggestion: vi.fn(),
      selectHistoryItem: vi.fn()
    }

    mockUseLogoSearch.mockReturnValue(mockSearchComposable)

    // Mock DOM methods
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      value: vi.fn(),
      writable: true
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(SearchBar, {
      props: {
        modelValue: '',
        ...props
      },
      global: {
        plugins: [pinia]
      }
    })
  }

  describe('Component Rendering', () => {
    it('renders with default props', () => {
      wrapper = createWrapper()
      
      expect(wrapper.find('.search-bar').exists()).toBe(true)
      expect(wrapper.find('.search-bar__input').exists()).toBe(true)
      expect(wrapper.find('.search-bar__icon').exists()).toBe(true)
    })

    it('renders with custom placeholder', () => {
      wrapper = createWrapper({ placeholder: 'Custom placeholder' })
      
      const input = wrapper.find('.search-bar__input')
      expect(input.attributes('placeholder')).toBe('Custom placeholder')
    })

    it('renders with custom aria-label', () => {
      wrapper = createWrapper({ ariaLabel: 'Custom aria label' })
      
      const input = wrapper.find('.search-bar__input')
      expect(input.attributes('aria-label')).toBe('Custom aria label')
    })

    it('displays loading spinner when isLoading is true', async () => {
      mockSearchComposable.isLoading.value = true
      wrapper = createWrapper()
      
      await nextTick()
      expect(wrapper.find('.search-bar__loading').exists()).toBe(true)
      expect(wrapper.find('.search-bar__spinner').exists()).toBe(true)
    })

    it('displays clear button when there is input', async () => {
      wrapper = createWrapper({ modelValue: 'test query' })
      
      await nextTick()
      expect(wrapper.find('.search-bar__clear').exists()).toBe(true)
    })

    it('hides clear button when input is empty', () => {
      wrapper = createWrapper({ modelValue: '' })
      
      expect(wrapper.find('.search-bar__clear').exists()).toBe(false)
    })
  })

  describe('Input Handling', () => {
    it('updates local query on input', async () => {
      wrapper = createWrapper()
      const input = wrapper.find('.search-bar__input')
      
      await input.setValue('test query')
      
      expect(wrapper.emitted('update:modelValue')).toEqual([['test query']])
      expect(mockSearchComposable.setSearchQuery).toHaveBeenCalledWith('test query')
    })

    it('emits update:modelValue when input changes', async () => {
      wrapper = createWrapper()
      const input = wrapper.find('.search-bar__input')
      
      await input.setValue('new value')
      
      expect(wrapper.emitted('update:modelValue')).toEqual([['new value']])
    })

    it('syncs with modelValue prop changes', async () => {
      wrapper = createWrapper({ modelValue: 'initial' })
      
      await wrapper.setProps({ modelValue: 'updated' })
      
      const input = wrapper.find('.search-bar__input')
      expect(input.element.value).toBe('updated')
      expect(mockSearchComposable.setSearchQuery).toHaveBeenCalledWith('updated')
    })

    it('clears search when clear button is clicked', async () => {
      wrapper = createWrapper({ modelValue: 'test query' })
      await nextTick()
      
      const clearButton = wrapper.find('.search-bar__clear')
      await clearButton.trigger('click')
      
      expect(wrapper.emitted('update:modelValue')).toContainEqual([''])
      expect(wrapper.emitted('clear')).toBeTruthy()
      expect(mockSearchComposable.clearSearchQuery).toHaveBeenCalled()
    })
  })

  describe('Focus and Blur Handling', () => {
    it('shows suggestions on focus', async () => {
      wrapper = createWrapper({ modelValue: 'g' })
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('focus')
      await nextTick()
      
      expect(wrapper.find('.search-bar--focused').exists()).toBe(true)
      expect(wrapper.emitted('focus')).toBeTruthy()
    })

    it('hides suggestions on blur after delay', async () => {
      wrapper = createWrapper({ modelValue: 'g' })
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('focus')
      await nextTick()
      
      expect(wrapper.find('.search-bar--focused').exists()).toBe(true)
      
      await input.trigger('blur')
      
      // Suggestions should still be visible immediately after blur
      expect(wrapper.find('.search-bar--focused').exists()).toBe(true)
      
      // Wait for the blur delay
      await new Promise(resolve => setTimeout(resolve, 200))
      await nextTick()
      
      expect(wrapper.emitted('blur')).toBeTruthy()
    })
  })

  describe('Suggestions Display', () => {
    it('displays filtered suggestions when focused and typing', async () => {
      wrapper = createWrapper({ modelValue: 'g' })
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('focus')
      await nextTick()
      
      const suggestions = wrapper.findAll('.search-bar__suggestion')
      expect(suggestions.length).toBeGreaterThan(0)
      
      // Should show suggestions that contain 'g'
      const suggestionTexts = suggestions.map(s => s.find('.search-bar__suggestion-text').text())
      expect(suggestionTexts).toContain('github')
      expect(suggestionTexts).toContain('google')
    })

    it('displays search history when available', async () => {
      wrapper = createWrapper({ modelValue: 'search' })
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('focus')
      await nextTick()
      
      const historyItems = wrapper.findAll('.search-bar__suggestion')
      const historyTexts = historyItems.map(s => s.find('.search-bar__suggestion-text').text())
      
      expect(historyTexts).toContain('previous search')
      expect(historyTexts).toContain('another search')
    })

    it('highlights matching text in suggestions', async () => {
      wrapper = createWrapper({ modelValue: 'git' })
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('focus')
      await nextTick()
      
      const suggestionText = wrapper.find('.search-bar__suggestion-text')
      expect(suggestionText.html()).toContain('<mark>git</mark>')
    })

    it('shows no suggestions message when no matches found', async () => {
      mockSearchComposable.searchSuggestions.value = []
      mockSearchComposable.searchHistory.value = []
      
      wrapper = createWrapper({ modelValue: 'xyz123' })
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('focus')
      await nextTick()
      
      expect(wrapper.find('.search-bar__no-suggestions').exists()).toBe(true)
      expect(wrapper.find('.search-bar__no-suggestions').text()).toBe('No suggestions found')
    })

    it('respects maxSuggestions prop', async () => {
      // Set up mock data that will match the search query
      mockSearchComposable.searchSuggestions.value = ['test1', 'test2', 'test3', 'test4', 'test5']
      
      wrapper = createWrapper({ 
        modelValue: 'test',
        maxSuggestions: 2
      })
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('focus')
      await nextTick()
      
      const suggestions = wrapper.findAll('.search-bar__suggestion')
        .filter(s => s.find('.search-bar__suggestion-type').text() === 'suggestion')
      
      expect(suggestions.length).toBe(2)
    })

    it('respects maxHistory prop', async () => {
      mockSearchComposable.searchHistory.value = ['hist1', 'hist2', 'hist3', 'hist4']
      
      wrapper = createWrapper({ 
        modelValue: 'hist',
        maxHistory: 2
      })
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('focus')
      await nextTick()
      
      const historyItems = wrapper.findAll('.search-bar__suggestion')
        .filter(s => s.find('.search-bar__suggestion-type').text() === 'recent')
      
      expect(historyItems.length).toBe(2)
    })
  })

  describe('Keyboard Navigation', () => {
    beforeEach(async () => {
      wrapper = createWrapper({ modelValue: 'g' })
      const input = wrapper.find('.search-bar__input')
      await input.trigger('focus')
      await nextTick()
    })

    it('navigates down with ArrowDown key', async () => {
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('keydown', { key: 'ArrowDown' })
      await nextTick()
      
      const activeSuggestion = wrapper.find('.search-bar__suggestion--active')
      expect(activeSuggestion.exists()).toBe(true)
    })

    it('navigates up with ArrowUp key', async () => {
      const input = wrapper.find('.search-bar__input')
      
      // First go down to select something
      await input.trigger('keydown', { key: 'ArrowDown' })
      await input.trigger('keydown', { key: 'ArrowDown' })
      await nextTick()
      
      // Then go up
      await input.trigger('keydown', { key: 'ArrowUp' })
      await nextTick()
      
      const activeSuggestions = wrapper.findAll('.search-bar__suggestion--active')
      expect(activeSuggestions.length).toBe(1)
    })

    it('wraps navigation at boundaries', async () => {
      const input = wrapper.find('.search-bar__input')
      const suggestions = wrapper.findAll('.search-bar__suggestion')
      
      // Navigate to last item
      for (let i = 0; i < suggestions.length; i++) {
        await input.trigger('keydown', { key: 'ArrowDown' })
      }
      await nextTick()
      
      // One more down should wrap to first
      await input.trigger('keydown', { key: 'ArrowDown' })
      await nextTick()
      
      const activeSuggestion = wrapper.find('.search-bar__suggestion--active')
      expect(activeSuggestion.exists()).toBe(true)
    })

    it('selects suggestion with Enter key', async () => {
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('keydown', { key: 'ArrowDown' })
      await input.trigger('keydown', { key: 'Enter' })
      
      expect(mockSearchComposable.selectSuggestion).toHaveBeenCalled()
      expect(wrapper.emitted('suggestion-select')).toBeTruthy()
    })

    it('performs search with Enter when no suggestion is active', async () => {
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('keydown', { key: 'Enter' })
      
      expect(wrapper.emitted('search')).toBeTruthy()
      expect(mockSearchComposable.setSearchQuery).toHaveBeenCalled()
    })

    it('closes suggestions with Escape key', async () => {
      const input = wrapper.find('.search-bar__input')
      
      // Ensure suggestions are visible
      expect(wrapper.find('.search-bar__suggestions').exists()).toBe(true)
      
      await input.trigger('keydown', { key: 'Escape' })
      await nextTick()
      
      expect(wrapper.find('.search-bar__suggestions').exists()).toBe(false)
    })

    it('selects first suggestion with Tab key', async () => {
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('keydown', { key: 'Tab' })
      await nextTick()
      
      const activeSuggestion = wrapper.find('.search-bar__suggestion--active')
      expect(activeSuggestion.exists()).toBe(true)
    })

    it('selects active suggestion with Tab key when one is highlighted', async () => {
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('keydown', { key: 'ArrowDown' })
      await input.trigger('keydown', { key: 'Tab' })
      
      expect(mockSearchComposable.selectSuggestion).toHaveBeenCalled()
    })
  })

  describe('Mouse Interactions', () => {
    beforeEach(async () => {
      wrapper = createWrapper({ modelValue: 'g' })
      const input = wrapper.find('.search-bar__input')
      await input.trigger('focus')
      await nextTick()
    })

    it('highlights suggestion on mouse enter', async () => {
      const suggestion = wrapper.find('.search-bar__suggestion')
      
      await suggestion.trigger('mouseenter')
      await nextTick()
      
      expect(suggestion.classes()).toContain('search-bar__suggestion--active')
    })

    it('selects suggestion on click', async () => {
      const suggestion = wrapper.find('.search-bar__suggestion')
      
      await suggestion.trigger('click')
      
      expect(mockSearchComposable.selectSuggestion).toHaveBeenCalled()
      expect(wrapper.emitted('suggestion-select')).toBeTruthy()
    })

    it('selects history item on click', async () => {
      const historyItem = wrapper.findAll('.search-bar__suggestion')
        .find(s => s.find('.search-bar__suggestion-type').text() === 'recent')
      
      if (historyItem) {
        await historyItem.trigger('click')
        
        expect(mockSearchComposable.selectHistoryItem).toHaveBeenCalled()
        expect(wrapper.emitted('suggestion-select')).toBeTruthy()
      }
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      wrapper = createWrapper()
      const input = wrapper.find('.search-bar__input')
      
      expect(input.attributes('role')).toBe('combobox')
      expect(input.attributes('aria-autocomplete')).toBe('list')
      expect(input.attributes('aria-haspopup')).toBe('listbox')
      expect(input.attributes('autocomplete')).toBe('off')
    })

    it('updates aria-expanded when suggestions are shown', async () => {
      wrapper = createWrapper({ modelValue: 'g' })
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('focus')
      await nextTick()
      
      expect(input.attributes('aria-expanded')).toBe('true')
    })

    it('sets aria-activedescendant when suggestion is active', async () => {
      wrapper = createWrapper({ modelValue: 'g' })
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('focus')
      await input.trigger('keydown', { key: 'ArrowDown' })
      await nextTick()
      
      const ariaActivedescendant = input.attributes('aria-activedescendant')
      expect(ariaActivedescendant).toBeTruthy()
      expect(ariaActivedescendant).toMatch(/^search-(suggestion|history)-\d+$/)
    })

    it('has proper listbox role for suggestions container', async () => {
      wrapper = createWrapper({ modelValue: 'g' })
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('focus')
      await nextTick()
      
      const suggestionsContainer = wrapper.find('.search-bar__suggestions')
      expect(suggestionsContainer.attributes('role')).toBe('listbox')
    })

    it('has proper option role for suggestion items', async () => {
      wrapper = createWrapper({ modelValue: 'g' })
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('focus')
      await nextTick()
      
      const suggestions = wrapper.findAll('.search-bar__suggestion')
      suggestions.forEach(suggestion => {
        expect(suggestion.attributes('role')).toBe('option')
      })
    })

    it('updates aria-selected for active suggestion', async () => {
      wrapper = createWrapper({ modelValue: 'g' })
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('focus')
      await input.trigger('keydown', { key: 'ArrowDown' })
      await nextTick()
      
      const activeSuggestion = wrapper.find('.search-bar__suggestion--active')
      expect(activeSuggestion.attributes('aria-selected')).toBe('true')
      
      const inactiveSuggestions = wrapper.findAll('.search-bar__suggestion:not(.search-bar__suggestion--active)')
      inactiveSuggestions.forEach(suggestion => {
        expect(suggestion.attributes('aria-selected')).toBe('false')
      })
    })

    it('has proper focus management', async () => {
      wrapper = createWrapper()
      const input = wrapper.find('.search-bar__input')
      const clearButton = wrapper.find('.search-bar__clear')
      
      // Input should be focusable
      expect(input.attributes('tabindex')).toBeUndefined() // Default focusable
      
      // Clear button should be focusable when present
      if (clearButton.exists()) {
        expect(clearButton.element.tagName).toBe('BUTTON')
      }
    })
  })

  describe('Event Emissions', () => {
    it('emits search event when Enter is pressed', async () => {
      wrapper = createWrapper({ modelValue: 'test query' })
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('keydown', { key: 'Enter' })
      
      expect(wrapper.emitted('search')).toEqual([['test query']])
    })

    it('emits suggestion-select event with correct data', async () => {
      wrapper = createWrapper({ modelValue: 'g' })
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('focus')
      await nextTick()
      
      const suggestion = wrapper.find('.search-bar__suggestion')
      await suggestion.trigger('click')
      
      const emitted = wrapper.emitted('suggestion-select')
      expect(emitted).toBeTruthy()
      expect(emitted[0][0]).toHaveProperty('type')
      expect(emitted[0][0]).toHaveProperty('value')
    })

    it('emits focus and blur events', async () => {
      wrapper = createWrapper()
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('focus')
      expect(wrapper.emitted('focus')).toBeTruthy()
      
      await input.trigger('blur')
      expect(wrapper.emitted('blur')).toBeTruthy()
    })

    it('emits clear event when clear button is clicked', async () => {
      wrapper = createWrapper({ modelValue: 'test' })
      await nextTick()
      
      const clearButton = wrapper.find('.search-bar__clear')
      await clearButton.trigger('click')
      
      expect(wrapper.emitted('clear')).toBeTruthy()
    })
  })

  describe('Configuration Options', () => {
    it('respects showSuggestions prop', async () => {
      wrapper = createWrapper({ 
        modelValue: 'g',
        showSuggestions: false
      })
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('focus')
      await nextTick()
      
      const suggestionItems = wrapper.findAll('.search-bar__suggestion')
        .filter(s => s.find('.search-bar__suggestion-type').text() === 'suggestion')
      
      expect(suggestionItems.length).toBe(0)
    })

    it('respects showHistory prop', async () => {
      wrapper = createWrapper({ 
        modelValue: 'search',
        showHistory: false
      })
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('focus')
      await nextTick()
      
      const historyItems = wrapper.findAll('.search-bar__suggestion')
        .filter(s => s.find('.search-bar__suggestion-type').text() === 'recent')
      
      expect(historyItems.length).toBe(0)
    })

    it('passes debounceDelay to useLogoSearch', () => {
      wrapper = createWrapper({ debounceDelay: 500 })
      
      expect(mockUseLogoSearch).toHaveBeenCalledWith({
        debounceDelay: 500
      })
    })
  })

  describe('Error Handling', () => {
    it('handles missing search composable gracefully', () => {
      mockUseLogoSearch.mockReturnValue({
        searchQuery: { value: '' },
        searchSuggestions: { value: [] },
        searchHistory: { value: [] },
        isLoading: { value: false },
        setSearchQuery: vi.fn(),
        clearSearchQuery: vi.fn(),
        selectSuggestion: vi.fn(),
        selectHistoryItem: vi.fn()
      })
      
      expect(() => createWrapper()).not.toThrow()
    })

    it('handles empty suggestions array', async () => {
      mockSearchComposable.searchSuggestions.value = []
      mockSearchComposable.searchHistory.value = []
      
      wrapper = createWrapper({ modelValue: 'test' })
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('focus')
      await nextTick()
      
      expect(wrapper.find('.search-bar__no-suggestions').exists()).toBe(true)
    })

    it('handles keyboard navigation with no suggestions', async () => {
      mockSearchComposable.searchSuggestions.value = []
      mockSearchComposable.searchHistory.value = []
      
      wrapper = createWrapper({ modelValue: 'test' })
      const input = wrapper.find('.search-bar__input')
      
      await input.trigger('focus')
      await input.trigger('keydown', { key: 'ArrowDown' })
      await nextTick()
      
      // Should not throw error
      expect(wrapper.findAll('.search-bar__suggestion--active').length).toBe(0)
    })
  })
})
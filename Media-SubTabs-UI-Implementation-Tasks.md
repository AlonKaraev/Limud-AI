# Media Sub-Tabs UI Implementation Tasks

## Project Context
Implementation of media filtering interface and grid layout for Limud AI's educational media management system. This builds upon the existing AudioManager and DocumentsManager components with a unified, user-friendly interface.

## Task Breakdown

[X] ### Task 1: Media Filtering Header Component
**Priority**: High  
**Dependencies**: None  
**Estimated Time**: 4-6 hours

#### Description
Create the top-line media filtering interface with upload, record, search, and expand functionality.

#### Requirements
- [X] **Upload Button (Top Left)**:
  - Prominent blue button with upload icon
  - Support for drag & drop functionality
  - File type validation based on current sub-tab
  - Progress indicator for uploads
  - Error handling with user-friendly messages

- [X] **Record Button (Audio/Video Only)**:
  - Only visible in Audio and Video sub-tabs
  - Red record icon with animation when active
  - Recording timer display
  - Stop/pause functionality
  - Audio level indicator

- [X] **Search Bar (Top Right)**:
  - Full-width search input with search icon
  - Placeholder text: "חפש בשם, תגיות, תיאור או תמלול..."
  - Real-time search suggestions
  - Search in: Name, tags, description, transcription/extracted text
  - Clear search button (X)

- [X] **Expand Button**:
  - Simple '^' chevron icon
  - Toggles between collapsed/expanded states
  - Smooth animation transition
  - Accessible keyboard navigation

#### Technical Specifications
```jsx
<MediaFilteringHeader>
  <div className="filter-top-row">
    <UploadButton mediaType={currentTab} />
    {(currentTab === 'audio' || currentTab === 'video') && (
      <RecordButton mediaType={currentTab} />
    )}
    <SearchBar 
      placeholder="חפש בשם, תגיות, תיאור או תמלול..."
      onSearch={handleSearch}
    />
    <ExpandButton 
      isExpanded={isExpanded}
      onClick={toggleExpanded}
    />
  </div>
</MediaFilteringHeader>
```

#### Manual Testing Steps
1. Verify upload button appears and functions in all sub-tabs
2. Confirm record button only shows in audio/video tabs
3. Test search functionality across all searchable fields
4. Validate expand/collapse animation works smoothly
5. Test keyboard navigation and accessibility
6. Verify responsive design on mobile devices

#### Expected User Journey
1. User enters media sub-tab
2. Sees clean, intuitive filtering interface
3. Can immediately upload files or start recording
4. Can search existing media instantly
5. Can expand for advanced filters when needed

---

[ ] ### Task 2: Expanded Media Filtering Panel
**Priority**: Medium  
**Dependencies**: Task 1 (Media Filtering Header)  
**Estimated Time**: 6-8 hours

#### Description
Create the expanded filtering panel that appears when the expand button is clicked, containing all advanced filtering options.

#### Requirements
- [ ] **Date Range Filter**:
  - From/To date pickers
  - Preset options: Today, This Week, This Month, This Year
  - Clear date range button

- [ ] **Media Type Filter** (for "All Media" tab):
  - Checkboxes for Audio, Video, Documents, Images
  - Select All/None options
  - File format sub-filters (MP3, MP4, PDF, etc.)

- [ ] **Tag Filter**:
  - Multi-select dropdown with existing tags
  - Create new tag option
  - Tag color coding
  - Remove tag functionality

- [ ] **Processing Status Filter**:
  - Dropdown: All, Processing, Completed, Failed, Pending
  - Status icons with tooltips
  - Retry failed items option

- [ ] **Size Filter**:
  - Size range slider (MB)
  - Preset size categories: Small (<10MB), Medium (10-100MB), Large (>100MB)

- [ ] **Duration Filter** (Audio/Video):
  - Duration range slider (minutes)
  - Preset durations: Short (<5min), Medium (5-30min), Long (>30min)

#### Technical Specifications
```jsx
<ExpandedFilters isVisible={isExpanded}>
  <FilterRow>
    <DateRangeFilter />
    <MediaTypeFilter currentTab={currentTab} />
  </FilterRow>
  <FilterRow>
    <TagFilter availableTags={tags} />
    <ProcessingStatusFilter />
  </FilterRow>
  <FilterRow>
    <SizeFilter />
    {(currentTab === 'audio' || currentTab === 'video') && (
      <DurationFilter />
    )}
  </FilterRow>
  <FilterActions>
    <ClearAllFilters />
    <ApplyFilters />
  </FilterActions>
</ExpandedFilters>
```

#### Testing Steps
1. Verify smooth expand/collapse animation
2. Test all filter combinations work correctly
3. Confirm filters persist during session
4. Validate clear all filters functionality
5. Test filter performance with large datasets
6. Verify mobile responsiveness of expanded panel

#### Expected User Journey
1. User clicks expand button
2. Panel smoothly expands showing all filters
3. User can combine multiple filters
4. Results update in real-time or on apply
5. User can easily clear filters and start over

---

[X] ### Task 3: Media Grid Layout System
**Priority**: High  
**Dependencies**: None (can work independently)  
**Estimated Time**: 8-10 hours

#### Description
Create a responsive grid layout system for displaying media items as rectangles with thumbnails/icons and essential information.

#### Requirements
- [X] **Grid Layout**:
  - Responsive grid (4 columns desktop, 2 tablet, 1 mobile)
  - Equal height rectangles with consistent spacing
  - Smooth hover animations
  - Loading skeleton states

- [X] **Media Rectangle Structure**:
  - Thumbnail/Icon area (top 60% of rectangle)
  - Information area (bottom 40% of rectangle)
  - Action buttons (bottom of rectangle)
  - Status indicators (top-right corner)

#### Technical Specifications
```jsx
<MediaGrid>
  {mediaItems.map(item => (
    <MediaRectangle key={item.id}>
      <ThumbnailArea>
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.name} />
        ) : (
          <MediaTypeIcon type={item.type} />
        )}
        <StatusIndicator status={item.status} />
      </ThumbnailArea>
      
      <InfoArea>
        <MediaTitle>{item.name}</MediaTitle>
        <MediaMeta>
          <Duration>{item.duration}</Duration>
          <FileSize>{item.size}</FileSize>
          <UploadDate>{item.uploadDate}</UploadDate>
        </MediaMeta>
        <TagsList tags={item.tags} />
      </InfoArea>
      
      <ActionButtons>
        <PlayButton />
        <EditButton />
        <ShareButton />
        <DeleteButton />
      </ActionButtons>
    </MediaRectangle>
  ))}
</MediaGrid>
```

#### Testing Steps
1. Test grid responsiveness across all screen sizes
2. Verify thumbnail generation for different media types
3. Test loading states and error handling
4. Confirm hover animations work smoothly
5. Validate accessibility with screen readers
6. Test performance with large numbers of items

#### Expected User Journey
1. User sees organized grid of their media
2. Can quickly identify media type from thumbnails/icons
3. Gets essential information at a glance
4. Can perform actions directly from grid
5. Grid adapts beautifully to their device

---

[ ] ### Task 4: Media Rectangle Information Display
**Priority**: Medium  
**Dependencies**: Task 3 (Media Grid Layout)  
**Estimated Time**: 4-5 hours

#### Description
Design and implement the information display within each media rectangle, showing essential details without overwhelming the user.

#### Requirements
- [ ] **Essential Information Only**:
  - Media title (truncated if too long)
  - Duration/page count (context-dependent)
  - File size (human-readable format)
  - Upload date (relative format: "2 days ago")
  - Processing status (if relevant)

- [ ] **Tag Display**:
  - Maximum 3 tags visible
  - "+X more" indicator for additional tags
  - Color-coded tag system
  - Tooltip on hover for full tag list

- [ ] **Visual Hierarchy**:
  - Title most prominent
  - Meta information secondary
  - Tags tertiary
  - Consistent typography scale

#### Technical Specifications
```jsx
<MediaInfo>
  <Title title={fullTitle}>
    {truncateTitle(item.name, 30)}
  </Title>
  
  <MetaRow>
    <MetaItem icon="clock">
      {formatDuration(item.duration)}
    </MetaItem>
    <MetaItem icon="file">
      {formatFileSize(item.size)}
    </MetaItem>
    <MetaItem icon="calendar">
      {formatRelativeDate(item.uploadDate)}
    </MetaItem>
  </MetaRow>
  
  <TagsDisplay>
    {item.tags.slice(0, 3).map(tag => (
      <Tag key={tag.id} color={tag.color}>
        {tag.name}
      </Tag>
    ))}
    {item.tags.length > 3 && (
      <MoreTags>+{item.tags.length - 3} more</MoreTags>
    )}
  </TagsDisplay>
</MediaInfo>
```

#### Testing Steps
1. Test title truncation with various lengths
2. Verify meta information displays correctly
3. Test tag display with different tag counts
4. Confirm tooltips work properly
5. Validate responsive behavior
6. Test with RTL text content

#### Expected User Journey
1. User scans grid quickly
2. Gets key information at a glance
3. Can see tags for organization
4. Understands file status immediately
5. Can hover for additional details

---

[ ] ### Task 5: Action Buttons Implementation
**Priority**: High  
**Dependencies**: Task 3 (Media Grid Layout)  
**Estimated Time**: 6-8 hours

#### Description
Implement action buttons below each media rectangle's thumbnail/icon, providing quick access to common operations.

#### Requirements
- [ ] **Button Types**:
  - Play/Preview button (primary action)
  - Edit/Rename button
  - Share button
  - Delete button (with confirmation)
  - Download button
  - More actions dropdown (context menu)

- [ ] **Context-Aware Buttons**:
  - Audio: Play, Edit Transcription, Share, Delete
  - Video: Play, Edit, Share, Delete
  - Documents: Preview, Edit Tags, Share, Delete
  - Images: View, Edit Tags, Share, Delete

- [ ] **Button Behavior**:
  - Hover states with tooltips
  - Loading states for async operations
  - Disabled states when appropriate
  - Keyboard navigation support

#### Technical Specifications
```jsx
<ActionButtons mediaType={item.type}>
  <PrimaryAction>
    {item.type === 'audio' && <PlayButton onClick={() => playAudio(item)} />}
    {item.type === 'video' && <PlayButton onClick={() => playVideo(item)} />}
    {item.type === 'document' && <PreviewButton onClick={() => previewDoc(item)} />}
    {item.type === 'image' && <ViewButton onClick={() => viewImage(item)} />}
  </PrimaryAction>
  
  <SecondaryActions>
    <EditButton onClick={() => editItem(item)} />
    <ShareButton onClick={() => shareItem(item)} />
    <DeleteButton 
      onClick={() => confirmDelete(item)}
      requiresConfirmation={true}
    />
  </SecondaryActions>
  
  <MoreActionsDropdown>
    <DownloadAction />
    <DuplicateAction />
    <MoveToFolderAction />
    <AddToLessonAction />
  </MoreActionsDropdown>
</ActionButtons>
```

#### Testing Steps
1. Test all button types across media types
2. Verify hover states and tooltips
3. Test confirmation dialogs for destructive actions
4. Confirm keyboard navigation works
5. Test loading states during operations
6. Validate accessibility compliance

#### Expected User Journey
1. User hovers over media rectangle
2. Action buttons become prominent
3. User clicks appropriate action
4. Action executes with proper feedback
5. User sees updated state immediately

---

[ ] ### Task 6: Responsive Design and Mobile Optimization
**Priority**: Medium  
**Dependencies**: Tasks 1-5 (All previous tasks)  
**Estimated Time**: 4-6 hours

#### Description
Ensure all media sub-tab components work seamlessly across all device sizes with touch-friendly interactions.

#### Requirements
- [ ] **Breakpoint Strategy**:
  - Mobile: < 768px (1 column grid)
  - Tablet: 768px - 1024px (2 column grid)
  - Desktop: > 1024px (4 column grid)
  - Large Desktop: > 1440px (5-6 column grid)

- [ ] **Mobile Optimizations**:
  - Touch-friendly button sizes (minimum 44px)
  - Swipe gestures for actions
  - Collapsible filter panel
  - Optimized thumbnail sizes
  - Reduced information density

- [ ] **Tablet Optimizations**:
  - Balanced information density
  - Touch and mouse support
  - Adaptive button layouts
  - Optimized for both orientations

#### Technical Specifications
```css
/* Mobile First Approach */
.media-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .media-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .media-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1440px) {
  .media-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}
```

#### Testing Steps
1. Test on actual mobile devices
2. Verify touch interactions work properly
3. Test orientation changes on tablets
4. Confirm all buttons are touch-friendly
5. Validate performance on slower devices
6. Test with various screen densities

#### Expected User Journey
1. User accesses on any device
2. Interface adapts perfectly to screen size
3. All interactions feel natural for device type
4. Performance remains smooth
5. Feature parity across all devices

---

[ ] ### Task 7: Integration with Existing Media Managers`
**Priority**: High  
**Dependencies**: Tasks 1-6 (All UI components)  
**Estimated Time**: 6-8 hours

#### Description
Integrate the new media sub-tabs UI with existing AudioManager and DocumentsManager components, ensuring data consistency and smooth transitions.

#### Requirements
- [ ] **Data Integration**:
  - Connect to existing media APIs
  - Maintain data consistency across components
  - Handle real-time updates
  - Sync with existing database schema

- [ ] **State Management**:
  - Unified state for all media types
  - Persistent filter states
  - Optimistic UI updates
  - Error boundary implementation

- [ ] **Migration Strategy**:
  - Gradual rollout capability
  - Fallback to existing components
  - User preference settings
  - A/B testing support

#### Technical Specifications
```jsx
// Unified Media Context
const MediaContext = createContext({
  audioItems: [],
  videoItems: [],
  documentItems: [],
  imageItems: [],
  filters: {},
  loading: false,
  error: null
});

// Integration Component
<MediaProvider>
  <MediaSubTabs>
    <TabPanel value="audio">
      <MediaFilteringHeader mediaType="audio" />
      <MediaGrid items={audioItems} />
    </TabPanel>
    <TabPanel value="video">
      <MediaFilteringHeader mediaType="video" />
      <MediaGrid items={videoItems} />
    </TabPanel>
    <TabPanel value="documents">
      <MediaFilteringHeader mediaType="documents" />
      <MediaGrid items={documentItems} />
    </TabPanel>
    <TabPanel value="images">
      <MediaFilteringHeader mediaType="images" />
      <MediaGrid items={imageItems} />
    </TabPanel>
  </MediaSubTabs>
</MediaProvider>
```

#### Testing Steps
1. Test data flow from existing APIs
2. Verify state synchronization
3. Test error handling and recovery
4. Confirm performance with large datasets
5. Test concurrent user scenarios
6. Validate data integrity

#### Expected User Journey
1. User transitions from old to new interface
2. All their existing media appears correctly
3. Filters and searches work as expected
4. New uploads integrate seamlessly
5. No data loss or corruption occurs

---

## Implementation Timeline

### Phase 1 (Week 1-2): Core Components
- Task 1: Media Filtering Header Component
- Task 3: Media Grid Layout System
- Task 5: Action Buttons Implementation

### Phase 2 (Week 3): Advanced Features
- Task 2: Expanded Media Filtering Panel
- Task 4: Media Rectangle Information Display

### Phase 3 (Week 4): Polish and Integration
- Task 6: Responsive Design and Mobile Optimization
- Task 7: Integration with Existing Media Managers

## Success Criteria

### Functional Requirements
- ✅ All media types display correctly in grid layout
- ✅ Filtering works across all searchable fields
- ✅ Upload and record functionality works seamlessly
- ✅ Action buttons perform expected operations
- ✅ Responsive design works on all devices

### Performance Requirements
- ✅ Grid loads within 2 seconds for 100+ items
- ✅ Search results appear within 500ms
- ✅ Smooth animations (60fps)
- ✅ Mobile performance remains fluid

### User Experience Requirements
- ✅ Intuitive navigation between sub-tabs
- ✅ Clear visual hierarchy and information display
- ✅ Accessible to users with disabilities
- ✅ Consistent with existing Limud AI design language

### Technical Requirements
- ✅ Integration with existing codebase
- ✅ Maintainable and extensible code
- ✅ Comprehensive error handling
- ✅ Cross-browser compatibility

## Risk Mitigation

### Technical Risks
- [ ] **Large Dataset Performance**: Implement virtual scrolling if needed
- [ ] **Mobile Performance**: Optimize images and reduce bundle size
- [ ] **Browser Compatibility**: Test on all supported browsers

### User Experience Risks
- [ ] **Learning Curve**: Provide onboarding tooltips and help
- [ ] **Information Overload**: Use progressive disclosure patterns
- [ ] **Touch Interactions**: Extensive mobile device testing

### Integration Risks
- [ ] **Data Migration**: Implement robust fallback mechanisms
- [ ] **API Changes**: Version API endpoints appropriately
- [ ] **State Conflicts**: Use proper state management patterns

import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ChangeDetectorRef,
  ElementRef,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Subject } from 'rxjs';

// PrimeNG Modules
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TableModule } from 'primeng/table';
import { FileUploadModule } from 'primeng/fileupload';
import { TooltipModule } from 'primeng/tooltip';
import { MessageModule } from 'primeng/message';
import { DropdownModule } from 'primeng/dropdown';

// Services & Interfaces
import { IGroup, IGenre } from '../EcommerceInterface';
import { GroupsService } from '../services/GroupsService';
import { GenresService } from '../services/GenresService';

// Environment
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-groups',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    GroupsService,
    GenresService,
    ConfirmationService,
    MessageService,
  ],
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DialogModule,
    ConfirmDialogModule,
    FileUploadModule,
    TooltipModule,
    MessageModule,
    DropdownModule,
  ],
  templateUrl: './GroupsComponent.html',
})
export class GroupsComponent implements OnInit, OnDestroy {
  @ViewChild('form') form!: NgForm;
  @ViewChild('fileInput') fileInput!: ElementRef;
  visibleError = false;
  errorMessage = '';
  groups: IGroup[] = [];
  filteredGroups: IGroup[] = [];
  visibleConfirm = false;
  imageGroup = '';
  visiblePhoto = false;
  photo = '';
  searchText: string = '';
  imageUrl: string = '';

  group: IGroup = {
    IdGroup: 0,
    NameGroup: '',
    ImageGroup: null,
    Photo: null,
    MusicGenreId: null, 
    NameMusicGenre: '',
    MusicGenre: '',
  };

  genres: any[] = [];
  @ViewChild('groupsTable') groupsTable!: ElementRef<HTMLTableElement>;
  private resizeObserver!: ResizeObserver;
  private destroy$ = new Subject<void>();

  // Services injected using inject()
  private groupsService = inject(GroupsService);
  private genresService = inject(GenresService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    // Initialize resize observer in ngAfterViewInit instead of using afterNextRender
  }

  ngOnInit(): void {
    this.getGenres();
    this.getGroups();
  }

  ngAfterViewInit(): void {
    this.setupTableResizeObserver();
  }

  getGroups() {
    this.groupsService.getGroups().subscribe({
      next: (groups: IGroup[]) => {
        this.groups = groups.map((group) => ({
          ...group,
          // Ensure all required properties have default values
          IdGroup: group.IdGroup || 0,
          NameGroup: group.NameGroup || 'Unknown',
          NameMusicGenre: group.NameMusicGenre || 'Unknown',
          TotalRecords: group.TotalRecords || 0,
          ImageGroup: group.ImageGroup || null,
          Photo: null,
          MusicGenreId: group.MusicGenreId || 0,
          MusicGenre: group.NameMusicGenre || 'Unknown',
        }));

        this.filteredGroups = [...this.groups];
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error fetching groups:', err);
        this.visibleError = true;
        this.errorMessage = 'Failed to load groups. Please try again.';
        if (err.error) {
          console.error('Error details:', err.error);
        }
        this.cdr.markForCheck();
      },
    });
  }

  getGenres() {
    this.genresService.getGenres().subscribe({
      next: (genres: IGenre[]) => {
        this.genres = genres.map((genre) => ({
          label: genre.NameMusicGenre,
          value: genre.IdMusicGenre,
        }));
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading genres:', err);
        this.visibleError = true;
        this.controlError(err);
        this.cdr.detectChanges();
      },
    });
  }

  filterGroups() {
    this.filteredGroups = this.groups.filter((group) =>
      group.NameGroup.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  private setupTableResizeObserver(): void {
    if (!this.groupsTable) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        console.log('The group table has been resized:', entry.contentRect);
        this.adjustTableColumns();
      });
    });

    this.resizeObserver.observe(this.groupsTable.nativeElement);
  }

  private adjustTableColumns(): void {
    if (!this.groupsTable) return;

    const table = this.groupsTable.nativeElement;
    const containerWidth = table.offsetWidth;
    const headers = table.querySelectorAll('th');

    // Adjust column widths based on container width
    if (containerWidth < 768) {
      // Mobile view
      headers.forEach((header, index) => {
        if (index > 1) {
          header.style.display = 'none';
        } else {
          header.style.display = 'table-cell';
          header.style.width = index === 0 ? '60%' : '40%';
        }
      });
    } else {
      // Desktop view
      headers.forEach((header) => {
        header.style.display = 'table-cell';
        header.style.width = ''; // Restore default width
      });
    }
  }

  onSearchChange() {
    this.filterGroups();
  }

  save() {
    // Validate required fields
    if (!this.group.NameGroup || !this.group.MusicGenreId) {
      this.visibleError = true;
      this.errorMessage = 'Name and Music Genre are required';
      console.error('Validation failed:', this.errorMessage);
      console.log('Current form values:', {
        NameGroup: this.group.NameGroup,
        MusicGenreId: this.group.MusicGenreId,
        imageUrl: this.imageUrl,
        Photo: this.group.Photo
      });
      return;
    }

    // Create FormData to handle form submission
    const formData = new FormData();

    try {

      // Add the required fields with the exact names expected by the API
      formData.append('nameGroup', this.group.NameGroup);
      formData.append('musicGenre', this.group.MusicGenreId.toString());

      // Add the image URL if provided
      if (this.imageUrl) {
        formData.append('imageUrl', this.imageUrl);
      }

    } catch (error) {
      console.error('Error preparing form data:', error);
      this.visibleError = true;
      this.errorMessage = 'Error preparing the request. Please try again.';
      return;
    }

    if (this.group.IdGroup === 0) {
      this.groupsService.addGroup(formData).subscribe({
        next: (data) => {
          this.visibleError = false;
          this.cancelEdition();
          this.getGroups();
        },
        error: (err) => {
          console.error('Error adding group:', err);
          this.visibleError = true;
          this.controlError(err);
        },
      });
    } else {
      // For update, we need to include the ID
      formData.append('id', this.group.IdGroup.toString());
      this.groupsService.updateGroup(formData).subscribe({
        next: (data) => {
          this.visibleError = false;
          this.cancelEdition();
          this.getGroups();
        },
        error: (err) => {
          console.error('Error updating group:', err);
          this.visibleError = true;
          this.controlError(err);
        },
      });
    }
  }

  edit(group: IGroup) {
    // Create a new object to ensure we don't modify the original
    this.group = {
      ...group,
      // Ensure MusicGenreId is set properly
      MusicGenreId: group.MusicGenreId || (group as any).musicGenre?._id || 0,
      // Set PhotoName for display
      PhotoName: group.ImageGroup
        ? this.extractNameImage(group.ImageGroup)
        : '',
    };

  }

  extractNameImage(url: string): string {
    return url.split('/').pop() || '';
  }

  cancelEdition() {
    this.group = {
      IdGroup: 0,
      NameGroup: '',
      ImageGroup: null,
      Photo: null,
      MusicGenreId: 0, // This should be a number as per IGroup interface
      NameMusicGenre: '',
      MusicGenre: '',
    };
    // Reset the form to clear any validation states
    if (this.form) {
      this.form.reset({
        IdGroup: 0,
        NameGroup: '',
        MusicGenreId: null,
      });
    }
    // Clear the file input manually after canceling to ensure UI reflects state
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    this.imageUrl = ''; // Also clear imageUrl on cancel
  }

  confirmDelete(group: IGroup) {
    this.confirmationService.confirm({
      message: `Delete the group ${group.NameGroup}?`,
      header: 'Are you sure?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteGroup(group.IdGroup!),
    });
  }

  deleteGroup(id: number) {
    this.groupsService.deleteGroup(id).subscribe({
      next: (data) => {
        this.visibleError = false;
        this.form.reset({
          nameMusicGenre: '',
        });
        this.getGroups();
      },
      error: (err) => {
        this.visibleError = true;
        this.controlError(err);
      },
    });
  }

  controlError(err: any) {
    if (err.error && typeof err.error === 'object' && err.error.message) {
      this.errorMessage = err.error.message;
    } else if (typeof err.error === 'string') {
      this.errorMessage = err.error;
    } else {
      this.errorMessage = 'An unexpected error has occurred';
    }
  }

  onChange(event: any) {
    console.log('onChange event triggered:', event);
    const file = event.target.files[0];
    console.log('Selected file in onChange:', file);
    if (file) {
      // Check if the file is an image
      if (!file.type.match('image.*')) {
        this.visibleError = true;
        this.errorMessage = 'Only image files are allowed';
        // Clear the file input
        if (this.fileInput) {
          this.fileInput.nativeElement.value = '';
        }
        this.group.Photo = null;
        this.group.PhotoName = null;
        this.imageUrl = ''; // Clear imageUrl if a file is selected
        console.log('Invalid file type. Group Photo set to null.');
        return;
      }

      // Update the group with the new photo
      this.group.Photo = file;
      this.group.PhotoName = file.name; 
      this.imageUrl = ''; 
      console.log('File assigned to this.group.Photo:', this.group.Photo);

    } else {
      // If no file is selected, clear the Photo and PhotoName
      this.group.Photo = null;
      this.group.PhotoName = null;
      console.log('No file selected. Group Photo set to null.');
    }
  }

  showImage(group: IGroup): void {
    // Toggle visibility if clicking the same group's image
    if (this.visiblePhoto && this.group?.IdGroup === group.IdGroup) {
      this.visiblePhoto = false;
      return;
    }

    // Set the current group
    this.group = { ...group };

    // Handle the image source safely
    if (group.ImageGroup) {
      const imageUrl = group.ImageGroup.toString();

      // If it's a base64 string or a data URL
      if (imageUrl.startsWith('data:image')) {
        this.photo = imageUrl;
      }
      // If it's just a filename, construct the full URL
      else if (!imageUrl.startsWith('http')) {
        this.photo = `${environment.urlAPI}uploads/${imageUrl}`;
      }
      // If it's already a full URL
      else {
        this.photo = imageUrl;
      }
    } else {
      // Set a default image if no image is available
      this.photo = 'assets/images/no-image-available.png';
      console.warn('No image available for group:', group.NameGroup);
    }

    this.visiblePhoto = true;
  }

  ngOnDestroy(): void {
    // Clear the resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.destroy$.next();
    this.destroy$.complete();
  }
}

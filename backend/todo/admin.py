from django.contrib import admin

# Register your models here.
from .models import Todo

class TodoAdmin(admin.ModelAdmin):
    list_display = ('title', 'description',"inprogress", 'completed')
    list_filter = ("inprogress", "completed")
    #search_fields = ('title', 'description')

# Register your models here.

admin.site.register(Todo, TodoAdmin)

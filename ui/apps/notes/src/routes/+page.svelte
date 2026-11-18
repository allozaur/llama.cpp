<script lang="ts">
	import NotesList from '#lib/components/NotesList.svelte';
</script>

<!-- a phone has no sidebar: the list is the page -->
<NotesList class="h-full p-4 md:hidden" />

<div class="hidden h-full items-center justify-center text-sm text-muted-foreground md:flex">
	Select a note, or create a new one.
</div>

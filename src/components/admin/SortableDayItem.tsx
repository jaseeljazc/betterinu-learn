import { useSortable, SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { GripVertical, ChevronDown, ChevronRight, X } from "lucide-react";
import { LessonSectionEditor } from "./LessonSectionEditor";
import { QuizBuilder } from "./QuizBuilder";
import { FileUploader } from "@/components/ui/FileUploader";

export function SortableDayItem({
  day, wIdx, dIdx, form, update, isDayCollapsed, setCollapsedDays, removeDay
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: day.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : 1 };

  function addModule() {
    const next = [...form.curriculum!];
    next[wIdx].days[dIdx].subModules.push({
      id: "m-" + Date.now().toString(36),
      title: "New Lesson",
      type: "doc",
      duration: "0",
      isCompleted: false,
      sections: []
    });
    update("curriculum", next);
  }

  function removeModule(mIdx: number) {
    const next = [...form.curriculum!];
    next[wIdx].days[dIdx].subModules = next[wIdx].days[dIdx].subModules.filter((_: any, i: number) => i !== mIdx);
    update("curriculum", next);
  }

  // Count sections inside 'doc' subModules
  const sectionsCount = day.subModules?.reduce((acc: number, mod: any) => acc + (mod.type === 'doc' ? (mod.sections?.length || 0) : 0), 0) || 0;

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-default bg-subtle p-3 relative shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 mr-4">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted hover:text-primary touch-none p-1"
          >
            <GripVertical className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsedDays((prev: any) => ({ ...prev, [day.id]: !prev[day.id] }))}
            className="text-muted hover:text-primary transition-colors p-1"
          >
            {isDayCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          <input
            value={day.title}
            onChange={(e) => {
              const next = [...form.curriculum!];
              next[wIdx].days[dIdx].title = e.target.value;
              update("curriculum", next);
            }}
            className="bg-transparent text-lg font-bold outline-none focus:underline flex-1 text-primary"
            placeholder="Day Title"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mr-2">
            {sectionsCount} {sectionsCount === 1 ? 'section' : 'sections'}
          </span>
          <button
            type="button"
            onClick={addModule}
            className="text-[10px] uppercase font-bold text-primary hover:underline"
          >
            + Add Lesson
          </button>
          <button
            type="button"
            onClick={() => removeDay(wIdx, dIdx)}
            className="text-muted hover:text-red-600 ml-2"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {!isDayCollapsed && (
        <div className="space-y-4 pt-2 border-t border-default/50 mt-2">
          {(!day.subModules || day.subModules.length === 0) && (
             <div className="flex flex-col items-center justify-center p-6 bg-white border border-dashed border-default rounded-lg text-muted">
                <p className="text-sm">No lessons found.</p>
                <button type="button" onClick={addModule} className="text-primary text-xs font-bold uppercase mt-2 hover:underline">+ Create Lesson</button>
             </div>
          )}
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              const { active, over } = event;
              if (over && active.id !== over.id) {
                const next = [...form.curriculum!];
                const oldIndex = next[wIdx].days[dIdx].subModules.findIndex((m: any) => m.id === active.id);
                const newIndex = next[wIdx].days[dIdx].subModules.findIndex((m: any) => m.id === over.id);
                next[wIdx].days[dIdx].subModules = arrayMove(next[wIdx].days[dIdx].subModules, oldIndex, newIndex);
                update("curriculum", next);
              }
            }}
          >
            <SortableContext items={day.subModules?.map((m: any) => m.id) || []} strategy={verticalListSortingStrategy}>
              {day.subModules?.map((mod: any, mIdx: number) => (
                <SortableModuleItem 
                  key={mod.id} 
                  mod={mod} 
                  mIdx={mIdx} 
                  wIdx={wIdx} 
                  dIdx={dIdx} 
                  form={form} 
                  update={update} 
                  removeModule={removeModule} 
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

function SortableModuleItem({ mod, mIdx, wIdx, dIdx, form, update, removeModule }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mod.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col gap-3 bg-white border border-default rounded-xl p-4 text-sm shadow-sm transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 relative z-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted hover:text-primary touch-none p-1"
        >
          <GripVertical className="size-4" />
        </button>
        <input
          value={mod.title || ''}
          placeholder="Lesson Title"
          onChange={(e) => {
            const next = [...form.curriculum!];
            next[wIdx].days[dIdx].subModules[mIdx].title = e.target.value;
            update("curriculum", next);
          }}
          className="flex-1 outline-none font-semibold text-foreground text-base placeholder:font-normal"
        />
        <select
          value={mod.type}
          onChange={(e) => {
            const next = [...form.curriculum!];
            next[wIdx].days[dIdx].subModules[mIdx].type = e.target.value;
            update("curriculum", next);
          }}
          className="bg-transparent font-semibold outline-none text-secondary border border-default rounded-md px-2 py-1"
        >
          <option value="doc">Doc / Sections</option>
          <option value="video">Video</option>
          <option value="mixed">Mixed</option>
          <option value="quiz">Quiz</option>
          <option value="assignment">Assignment</option>
        </select>
        <input
          value={mod.duration || ''}
          placeholder="Duration"
          onChange={(e) => {
            const next = [...form.curriculum!];
            next[wIdx].days[dIdx].subModules[mIdx].duration = e.target.value;
            update("curriculum", next);
          }}
          className="w-24 text-right outline-none text-secondary border border-default rounded-md px-2 py-1"
        />
        <button
          type="button"
          onClick={() => removeModule(mIdx)}
          className="text-muted hover:text-red-600 ml-1 p-1"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex items-start border-t border-default pt-2 mt-2">
        {mod.type === 'video' && (
          <div className="flex flex-col w-full gap-3">
            <input 
              value={mod.videoUrl || ''} 
              onChange={(e) => {
                const next = [...form.curriculum!];
                next[wIdx].days[dIdx].subModules[mIdx].videoUrl = e.target.value;
                update("curriculum", next);
              }}
              placeholder="YouTube Video ID (e.g. dQw4w9WgXcQ) or full URL" 
              className="flex-1 bg-surface outline-none text-foreground border border-default rounded-md px-3 py-2" 
            />
            <textarea 
              value={mod.description || ''} 
              onChange={(e) => {
                const next = [...form.curriculum!];
                next[wIdx].days[dIdx].subModules[mIdx].description = e.target.value;
                update("curriculum", next);
              }}
              placeholder="Video Summary (appears below the video)" 
              className="flex-1 bg-surface outline-none text-foreground resize-y min-h-[120px] rounded-md border border-default p-3" 
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted mb-2">Attachments</p>
              <FileUploader
                folder={`lessons/${mod.id}`}
                files={mod.attachedFiles ?? []}
                onChange={(files: any[]) => {
                  const next = [...form.curriculum!];
                  next[wIdx].days[dIdx].subModules[mIdx].attachedFiles = files;
                  update("curriculum", next);
                }}
                role="admin"
              />
            </div>
          </div>
        )}
        {mod.type === 'doc' && (
          <div className="w-full space-y-3">
            <LessonSectionEditor
              sections={mod.sections ?? []}
              moduleId={mod.id}
              onChange={(sections) => {
                const next = [...form.curriculum!];
                next[wIdx].days[dIdx].subModules[mIdx].sections = sections;
                update("curriculum", next);
              }}
            />
          </div>
        )}
        {mod.type === 'mixed' && (
          <div className="w-full space-y-4">
             <p className="text-xs italic text-muted">Mixed lessons are deprecated. Please change type to 'Doc / Sections'.</p>
          </div>
        )}
        {mod.type === 'quiz' && (
          <div className="w-full">
            <QuizBuilder 
              quizData={mod.quizData} 
              onChange={(newData: any) => {
                const next = [...form.curriculum!];
                next[wIdx].days[dIdx].subModules[mIdx].quizData = newData;
                update("curriculum", next);
              }}
            />
          </div>
        )}
        {mod.type === 'assignment' && (
          <div className="w-full flex flex-col gap-3">
            <textarea
              value={mod.description || ''}
              onChange={(e) => {
                const next = [...form.curriculum!];
                next[wIdx].days[dIdx].subModules[mIdx].description = e.target.value;
                update("curriculum", next);
              }}
              placeholder="Assignment instructions (visible to students)"
              className="flex-1 bg-surface outline-none text-foreground resize-y min-h-[140px] rounded-md border border-default p-3"
            />
          </div>
        )}
      </div>
    </div>
  );
}

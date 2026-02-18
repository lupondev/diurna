'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { useState } from 'react'

type QuizQuestion = { q: string; options: string[]; correct: number }

function QuizComponent({ node, updateAttributes, deleteNode, selected }: {
  node: { attrs: { questions: QuizQuestion[] } }
  updateAttributes: (attrs: Record<string, unknown>) => void
  deleteNode: () => void
  selected: boolean
}) {
  const { questions } = node.attrs
  const [editingQ, setEditingQ] = useState<number | null>(null)

  function updateQuestion(idx: number, updates: Partial<QuizQuestion>) {
    const newQs = questions.map((q: QuizQuestion, i: number) => i === idx ? { ...q, ...updates } : q)
    updateAttributes({ questions: newQs })
  }

  function addQuestion() {
    updateAttributes({ questions: [...questions, { q: 'New question?', options: ['Answer A', 'Answer B', 'Answer C', 'Answer D'], correct: 0 }] })
  }

  return (
    <NodeViewWrapper data-type="quiz" className={`blk blk-quiz ${selected ? 'blk-selected' : ''}`}>
      <div className="blk-head">
        <span className="blk-icon">🧠</span>
        <span className="blk-label">Quiz</span>
        <button className="blk-del" onClick={deleteNode} title="Remove block">×</button>
      </div>
      {(questions || []).map((q: QuizQuestion, qi: number) => (
        <div key={qi} className="blk-quiz-q">
          <div className="blk-quiz-qnum">Q{qi + 1}</div>
          {editingQ === qi ? (
            <input
              className="blk-quiz-qinput"
              value={q.q}
              autoFocus
              onChange={(e) => updateQuestion(qi, { q: e.target.value })}
              onBlur={() => setEditingQ(null)}
              onKeyDown={(e) => { if (e.key === 'Enter') setEditingQ(null) }}
            />
          ) : (
            <div className="blk-quiz-qtext" onClick={() => setEditingQ(qi)}>{q.q}</div>
          )}
          <div className="blk-quiz-opts">
            {q.options.map((opt: string, oi: number) => (
              <div
                key={oi}
                className={`blk-quiz-opt ${oi === q.correct ? 'correct' : ''}`}
                onClick={() => updateQuestion(qi, { correct: oi })}
              >
                <span className="blk-quiz-check">{oi === q.correct ? '✓' : '○'}</span>
                <input
                  className="blk-quiz-opt-input"
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...q.options]
                    newOpts[oi] = e.target.value
                    updateQuestion(qi, { options: newOpts })
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            ))}
          </div>
          {questions.length > 1 && (
            <button className="blk-quiz-rm" onClick={() => updateAttributes({ questions: questions.filter((_: QuizQuestion, i: number) => i !== qi) })}>
              Remove question
            </button>
          )}
        </div>
      ))}
      <button className="blk-add-opt" onClick={addQuestion}>+ Add question</button>
    </NodeViewWrapper>
  )
}

export const QuizBlock = Node.create({
  name: 'quiz',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      questions: {
        default: [{ q: 'Question?', options: ['Answer A', 'Answer B', 'Answer C', 'Answer D'], correct: 0 }],
        parseHTML: (el: HTMLElement) => {
          try { return JSON.parse(el.getAttribute('data-questions') || '[]') } catch { return [] }
        },
        renderHTML: (attrs: { questions: QuizQuestion[] }) => ({ 'data-questions': JSON.stringify(attrs.questions) }),
      },
    }
  },

  parseHTML() { return [{ tag: 'div[data-type="quiz"]' }] },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'quiz' }), 0]
  },

  addNodeView() { return ReactNodeViewRenderer(QuizComponent as never) },
})

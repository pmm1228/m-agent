import { describe, it, expect } from 'vitest'
import { tryParseTodoCommand } from './todos'

describe('todos', () => {
  describe('tryParseTodoCommand', () => {
    it('should parse "添加待办：xxx" format', () => {
      const result = tryParseTodoCommand('添加待办：买牛奶')
      expect(result).toEqual({ action: 'create', title: '买牛奶' })
    })

    it('should parse "添加待办: xxx" format with colon', () => {
      const result = tryParseTodoCommand('添加待办: 买牛奶')
      expect(result).toEqual({ action: 'create', title: '买牛奶' })
    })

    it('should parse "请添加待办：xxx" format', () => {
      const result = tryParseTodoCommand('请添加待办：买牛奶')
      expect(result).toEqual({ action: 'create', title: '买牛奶' })
    })

    it('should parse "帮我添加待办：xxx" format', () => {
      const result = tryParseTodoCommand('帮我添加待办：买牛奶')
      expect(result).toEqual({ action: 'create', title: '买牛奶' })
    })

    it('should parse "帮忙添加待办：xxx" format', () => {
      const result = tryParseTodoCommand('帮忙添加待办：买牛奶')
      expect(result).toEqual({ action: 'create', title: '买牛奶' })
    })

    it('should parse "创建待办：xxx" format', () => {
      const result = tryParseTodoCommand('创建待办：买牛奶')
      expect(result).toEqual({ action: 'create', title: '买牛奶' })
    })

    it('should parse "新建待办：xxx" format', () => {
      const result = tryParseTodoCommand('新建待办：买牛奶')
      expect(result).toEqual({ action: 'create', title: '买牛奶' })
    })

    it('should parse "创建一条待办：xxx" format', () => {
      const result = tryParseTodoCommand('创建一条待办：买牛奶')
      expect(result).toEqual({ action: 'create', title: '买牛奶' })
    })

    it('should parse "创建一个待办：xxx" format', () => {
      const result = tryParseTodoCommand('创建一个待办：买牛奶')
      expect(result).toEqual({ action: 'create', title: '买牛奶' })
    })

    it('should parse "把「xxx」加入待办" format with Chinese quotes', () => {
      const result = tryParseTodoCommand('把「买牛奶」加入待办')
      expect(result).toEqual({ action: 'create', title: '买牛奶' })
    })

    it('should parse "帮我把「xxx」加到待办" format', () => {
      const result = tryParseTodoCommand('帮我把「买牛奶」加到待办')
      expect(result).toEqual({ action: 'create', title: '买牛奶' })
    })

    it('should parse "把「xxx」添加到todo" format', () => {
      const result = tryParseTodoCommand('把「买牛奶」添加到todo')
      expect(result).toEqual({ action: 'create', title: '买牛奶' })
    })

    it('should parse "把「xxx」写进任务" format', () => {
      const result = tryParseTodoCommand('把「买牛奶」写进任务')
      expect(result).toEqual({ action: 'create', title: '买牛奶' })
    })

    it('should parse with double quotes', () => {
      const result = tryParseTodoCommand('把"买牛奶"加入待办')
      expect(result).toEqual({ action: 'create', title: '买牛奶' })
    })

    it('should parse with single quotes', () => {
      const result = tryParseTodoCommand("把'买牛奶'加入待办")
      expect(result).toEqual({ action: 'create', title: '买牛奶' })
    })

    it('should parse without quotes', () => {
      const result = tryParseTodoCommand('把买牛奶加入待办')
      expect(result).toEqual({ action: 'create', title: '买牛奶' })
    })

    it('should parse with trailing spaces', () => {
      const result = tryParseTodoCommand('添加待办：买牛奶  ')
      expect(result).toEqual({ action: 'create', title: '买牛奶' })
    })

    it('should parse with leading spaces', () => {
      const result = tryParseTodoCommand('  添加待办：买牛奶')
      expect(result).toEqual({ action: 'create', title: '买牛奶' })
    })

    it('should parse complex titles', () => {
      const result = tryParseTodoCommand('添加待办：明天下午三点开会')
      expect(result).toEqual({ action: 'create', title: '明天下午三点开会' })
    })

    it('should parse titles with special characters', () => {
      const result = tryParseTodoCommand('添加待办：@#$%^&*')
      expect(result).toEqual({ action: 'create', title: '@#$%^&*' })
    })

    it('should return null for non-matching input', () => {
      expect(tryParseTodoCommand('普通聊天消息')).toBeNull()
      expect(tryParseTodoCommand('待办列表')).toBeNull()
      expect(tryParseTodoCommand('买牛奶')).toBeNull()
      expect(tryParseTodoCommand('待办买牛奶')).toBeNull()
    })

    it('should return null for empty input', () => {
      expect(tryParseTodoCommand('')).toBeNull()
      expect(tryParseTodoCommand('   ')).toBeNull()
    })

    it('should return null when title is empty', () => {
      expect(tryParseTodoCommand('添加待办：')).toBeNull()
      expect(tryParseTodoCommand('添加待办：   ')).toBeNull()
    })
  })
})
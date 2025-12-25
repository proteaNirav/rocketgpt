import type {
  PlannerRequest,
  PlannerResponse,
  PlanStep,
} from '@/types/planner';

export function validatePlannerRequest(body: any): PlannerRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body: expected an object.');
  }

  if (typeof body.goal !== 'string' || body.goal.trim().length === 0) {
    throw new Error('PlannerRequest.goal must be a non-empty string.');
  }

  const request: PlannerRequest = {
    goal: body.goal.trim(),
  };

  if (typeof body.context === 'string' && body.context.trim().length > 0) {
    request.context = body.context.trim();
  }

  if (body.constraints && typeof body.constraints === 'object') {
    request.constraints = {};
    if (typeof body.constraints.maxSteps === 'number') {
      request.constraints.maxSteps = body.constraints.maxSteps;
    }
    if (typeof body.constraints.maxTokens === 'number') {
      request.constraints.maxTokens = body.constraints.maxTokens;
    }
    if (typeof body.constraints.strict === 'boolean') {
      request.constraints.strict = body.constraints.strict;
    }
  }

  if (body.preferences && typeof body.preferences === 'object') {
    request.preferences = {};
    if (
      body.preferences.depth === 'shallow' ||
      body.preferences.depth === 'medium' ||
      body.preferences.depth === 'deep'
    ) {
      request.preferences.depth = body.preferences.depth;
    }
    if (
      body.preferences.style === 'technical' ||
      body.preferences.style === 'simple' ||
      body.preferences.style === 'mixed'
    ) {
      request.preferences.style = body.preferences.style;
    }
    if (typeof body.preferences.allowParallel === 'boolean') {
      request.preferences.allowParallel = body.preferences.allowParallel;
    }
  }

  if (body.model && typeof body.model === 'object') {
    request.model = {};
    if (
      body.model.provider === 'openai' ||
      body.model.provider === 'anthropic' ||
      body.model.provider === 'local'
    ) {
      request.model.provider = body.model.provider;
    }
    if (typeof body.model.modelName === 'string') {
      request.model.modelName = body.model.modelName;
    }
    if (typeof body.model.temperature === 'number') {
      request.model.temperature = body.model.temperature;
    }
    if (typeof body.model.maxTokens === 'number') {
      request.model.maxTokens = body.model.maxTokens;
    }
  }

  return request;
}

export function validatePlannerResponse(resp: PlannerResponse): PlannerResponse {
  if (!resp) {
    throw new Error('PlannerResponse is empty.');
  }
  if (typeof resp.goal !== 'string' || resp.goal.trim().length === 0) {
    throw new Error('PlannerResponse.goal must be a non-empty string.');
  }
  if (!Array.isArray(resp.steps) || resp.steps.length === 0) {
    throw new Error('PlannerResponse.steps must be a non-empty array.');
  }

  resp.steps.forEach((step: PlanStep, idx: number) => {
    if (typeof step.id !== 'string' || step.id.trim().length === 0) {
      throw new Error('PlanStep[' + idx + '].id must be a non-empty string.');
    }
    if (typeof step.title !== 'string' || step.title.trim().length === 0) {
      throw new Error('PlanStep[' + idx + '].title must be a non-empty string.');
    }
    if (typeof step.description !== 'string') {
      throw new Error('PlanStep[' + idx + '].description must be a string.');
    }
    if (
      step.type !== 'action' &&
      step.type !== 'analysis' &&
      step.type !== 'decision' &&
      step.type !== 'subtask'
    ) {
      throw new Error(
        'PlanStep[' + idx + '].type must be one of action|analysis|decision|subtask.',
      );
    }
  });

  return resp;
}

export interface FormattedChatTemplate {
	name: string;
	template: string;
	formattedTemplate: string;
	templateUnedited: string;
	formattedTemplateUnedited: string;
}

export type ChatTemplate = string | Omit<FormattedChatTemplate, 'formattedTemplate'>[];
